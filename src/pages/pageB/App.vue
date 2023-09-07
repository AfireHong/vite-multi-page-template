<template>
  <h1>pageB</h1>
  <div class="nav">
    <div class="tab" @click="switchTab('/home')">👉🏻home</div>
    <div class="tab" @click="switchTab('/about')">👉🏻about</div>
  </div>
  <router-view />
</template>
<script lang="ts" setup>
import { RouterView, useRouter } from "vue-router";

const router = useRouter();
const switchTab = (path: string) => {
  router.push(path);
};
</script>
<style scoped>
.nav {
  display: flex;
}
.tab {
  margin-right: 20px;
  cursor: pointer;
}
</style>
