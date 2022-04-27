import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import history from "connect-history-api-fallback";
import glob from "glob";
const multiPage = {};

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
function pathRewritePlugin() {
  const rules: any[] = [];
  console.log(multiPage);

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
getInput();

// https://vitejs.dev/config/
export default defineConfig({
  // plugins: [vue()],
  plugins: [vue(), pathRewritePlugin()],
  build: {
    rollupOptions: {
      input: pageEntry,
    },
  },
});
