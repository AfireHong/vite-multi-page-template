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
