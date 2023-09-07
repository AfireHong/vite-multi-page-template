import { createWebHistory, createRouter } from "vue-router";

const router = createRouter({
  history: createWebHistory("/pageB"),
  routes: [
    {
      path: "/",
      redirect: "home",
    },
    {
      name: "home",
      component: () => import("../pageB/components/home.vue"),
      path: "/home",
    },
    {
      name: "about",
      component: () => import("../pageB/components/about.vue"),
      path: "/about",
    },
  ],
});

export default router;
