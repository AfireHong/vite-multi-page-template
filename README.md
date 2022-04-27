## 1 多入口开发业务场景

SPA 是目前前端领域主流的项目形态，但如果一个项目需要复用部分代码逻辑接入了多个业务，业务之间直接的关联性不大，并且不需要直接路由跳转，则可以通过 MPA 的配置进行解耦（这里不讨论微前端那一套）。形成这样的目录结构：

```
pages
├── pageA
│   ├── App.vue
│   ├── index.html
│   ├── main.ts
└── pageB
    ├── App.vue
    ├── index.html
    └── main.ts
```

这样做的好处是我们能够在一个项目内将各个页面隔离开来，每个页面又能复用项目内公共代码逻辑，进而又可以通过 monorepo 的方式管理我们的代码。

## 2 从零开始配置 vite 多入口开发

### 2.1 前言

vite 官方提供了多入口打包与开发的配置，但是官方的案例给的目录结构并不友好，无法满足我们各个页面在同一目录下平级的需求（强迫症患者也不乐意）。在网上搜集了相关资料后，发现大家多多少少都遇到一些坑点，例如无法使用 history 模式的路由。本文会提供一个新的解决思路。

### 2.2 创建 vite+vue+ts 项目

这个就不多说了，直接官网文档，一把梭下去就行：

```
yarn create vite
```

### 2.3 创建多入口页面

我们还是选择第 1 节提到的方式组织目录结构，先提前引入 vue-router

```sh
yarn add vue-router@4
```

接下来创建文件目录，因为 vite 是基于 html 开始打包的，所以我们在每个目录下都创建各自的 html 文件。

```
└── pages
    ├── pageA
    │   ├── App.vue
    │   ├── components
    │   │   ├── about.vue
    │   │   └── home.vue
    │   ├── index.html
    │   ├── main.ts
    │   └── router.ts
    └── pageB
        ├── App.vue
        ├── index.html
        └── main.ts
```

**_注意：_** html 内引入 ts 文件必须使用绝对路径，也就是从根目录开始，例如`/src/pages/pageA/index.html`内引入 ts 文件是这样引入：

```html
<script type="module" src="/src/pages/pageA/main.ts"></script>
```

### 2.4 编辑配置文件 vite.config.ts

参考 vite 的官方文档，修改 build 下的 rollupOptions 选项。

```js
// 这是vite官方的案例
build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      }
    }
}
```

接下来我们配置我们这个项目的多入口。

聪明的前端工程师，当然不会自己手动一个个引入吧？所以写一个方法自动获取：

```js
// 保存每个页面的名称和路径，后面会用到
const multiPage = {};
// 保存页面文件路径
const pageEntry = {};

function getInput() {
  const allEntry = glob.sync("./src/pages/**/index.html");
  allEntry.forEach((entry: string) => {
    const pathArr = entry.split("/");
    const name = pathArr[pathArr.length - 2];
    multiPage[name] = {
      name,
      rootPage: `/src/pages/${name}/index.html`,
    };
    pageEntry[name] = resolve(__dirname, `/src/pages/${name}/index.html`);
  });
}
// 调用一下
getInput();
```

好，现在我们获取到了每个页面的入口，接下来就可以添加进配置了

```js
export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      // 在这里引入就行
      input: pageEntry,
    },
  },
});
```

启动项目，通过`http://localhost:3000/src/pages/pageB/index.html`或者`http://localhost:3000/src/pages/pageA/index.html`，访问我们的页面了。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7b81de3e7d504556850b5331e3ba7305~tplv-k3u1fbpfcp-watermark.image?)

**_前方~~踩坑~~预警_**

### 2.5 路由配置

在之前我们引入了路由，还没有进行配置，现在简单在 pageA 下简单配置一下，这里我们使用 history 模式的路由。

```ts
// src/pages/pageA/router.ts

import { createWebHistory, createRouter } from "vue-router";

const router = createRouter({
  history: createWebHistory("/src/pages/pageA/index.html"),
  routes: [
    {
      path: "/",
      redirect: "home",
    },
    {
      name: "home",
      component: () => import("../pageA/components/home.vue"),
      path: "/home",
    },
    {
      name: "about",
      component: () => import("../pageA/components/about.vue"),
      path: "/about",
    },
  ],
});

export default router;
```

**_注意：_** 由于我们是用过`http://localhost:3000/src/pages/pageB/index.html`访问的页面，所以路由`base`应该是`/src/pages/pageA/index.html`。

这样就可以通过`http://localhost:3000/src/pages/pageA/index.html/about`访问咱们页面下的路由了。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2c657a1e44034f949dbf414c2a4f4b56~tplv-k3u1fbpfcp-watermark.image?)
**_但是！！_**

当我们刷新页面，**页面就会 404**！显然 vite 的开发服务是没有对这块进行处理的。并且，我们部署页面时，**通过这么一长串 url 去访问非常的不友好**，所以路由的`base`也不能设置这么长。我们最终要的效果就是可以直接通过`http://localhost:3000/pageA/about`可以访问我们的页面。

我们男人想要的必须要得到，那么就准备动手搞事。

### 2.6 编写插件重写开发服务路径

既然是开发服务的问题，那么我们就对他的开发服务动手，vite 插件暴露出了`configureServer`这个钩子给我们操作。

我们引入一个第三方中间件:`connect-history-api-fallback`，可以帮助我们对访问路径进行重写，例如我们访问`/home`，可以重写为`/index.html/home`。这里就不具体介绍它的作用了，[具体可以查看官方文档](https://github.com/bripkens/connect-history-api-fallback/)

```sh
yarn add connect-history-api-fallback -D
```

我们需要实现的目标是通过访问`http://localhost:3000/pageA`与访问`http://localhost:3000/src/pages/pageA/index.html`的效果相同。那么我们可以这样编写我们的插件。

```ts
function pathRewritePlugin() {
  const rules: any[] = [];
  Reflect.ownKeys(multiPage).forEach((key) => {
    rules.push({
      from: `/${multiPage[key].name}`,
      to: `${multiPage[key].rootPage}`,
    });
  });
  return {
    name: "path-rewrite-plugin",
    configureServer(server) {
      server.middlewares.use(
        history({
          htmlAcceptHeaders: ["text/html", "application/xhtml+xml"],
          disableDotRule: false,
          rewrites: rules,
        })
      );
    },
  };
}
// 这里的multiPage是之前获取目录结构时保存的，形如：
{
  pageA: { name: 'pageA', rootPage: '/src/pages/pageA/index.html' },
  pageB: { name: 'pageB', rootPage: '/src/pages/pageB/index.html' }
}
```

既然是直接访问`http://localhost:3000/pageA`，那么在路由配置中的`base`也可以改成`/pageA`:

```ts
import { createWebHistory, createRouter } from "vue-router";

const router = createRouter({
  history: createWebHistory("/pageA"),
  routes: [
    {
      path: "/",
      redirect: "home",
    },
    {
      name: "home",
      component: () => import("../pageA/components/home.vue"),
      path: "/home",
    },
    {
      name: "about",
      component: () => import("../pageA/components/about.vue"),
      path: "/about",
    },
  ],
});

export default router;
```

我们再次访问`http://localhost:3000/pageA/home`，页面就能展示出来了，并且刷新也不会再 404 了，大功告成。

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/db8a8161a9544f9295752c223cfb7403~tplv-k3u1fbpfcp-watermark.image?)

## 3 小结

通过开发服务的路径重写，解决了刷新页面 404 的问题，并且简化了 url 的长度，开发体验大幅提高。但还是有个问题就是我们打包之后的路径是这样的，这就需要我们根据具体的部署方式去调整了。

```
dist
├── assets
│   ├── about.5052946a.js
│   ├── about.6eb1a9e1.css
│   ├── home.9d0be310.js
│   ├── home.cf51e8ea.css
│   ├── pageA.2b5e835c.css
│   ├── pageA.8b201e14.js
│   ├── pageB.6f5bd5c0.js
│   └── plugin-vue_export-helper.ccddabf8.js
├── favicon.ico
└── src
    └── pages
        ├── pageA
        │   └── index.html
        └── pageB
            └── index.html
```

如果你想要这样的输出结构，就需要调整 root 的路径。

```
dist
├── assets
│   ├── about.5052946a.js
│   ├── about.6eb1a9e1.css
│   ├── home.9d0be310.js
│   ├── home.cf51e8ea.css
│   ├── pageA.7212b367.js
│   ├── pageA.c4b1b587.css
│   ├── pageB.6f5bd5c0.js
│   └── plugin-vue_export-helper.ccddabf8.js
├── pageA
│   └── index.html
└── pageB
    └── index.html
```

这里是我的配置方法。

```js
export default defineConfig({
  base: "./",
  root: "src/pages",
  plugins: [vue(), pathRewritePlugin()],
  build: {
    outDir: "../../dist",
    rollupOptions: {
      input: pageEntry,
    },
  },
});
```

**_注意:_** 如果你修改了根路径，那么你其他文件使用了绝对路径也需要随之更改。

[以上源码全部放在了 github，点击这里获取](https://github.com/AfireHong/vite-multi-page-template)
