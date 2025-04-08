import { createRouter, createWebHashHistory } from "vue-router";
import ChatView from "../views/ChatView.vue"; // <-- Import directly

const routes = [
  {
    path: "/",
    name: "Welcome",
    component: () => import("../views/WelcomeView.vue"), // Lazy load welcome page
  },
  {
    path: "/setup",
    name: "Setup",
    component: () => import("../views/SetupView.vue"), // Lazy load
  },
  {
    path: "/chat",
    name: "Chat",
    component: ChatView, // <-- Use direct import
  },
  {
    path: "/api-keys",
    name: "ApiKeySettings",
    component: () => import("../views/ApiKeySettingsView.vue"), // Lazy load
  },
];

const router = createRouter({
  history: createWebHashHistory(), // Use hash history for simplicity in WebView
  routes,
});

// Navigation guard to check configuration status
router.beforeEach((to, _from, next) => {
  // Allow direct access to welcome and setup pages
  if (to.path === "/" || to.path === "/setup") {
    next();
    return;
  }

  // For other routes, we could add logic to check if AI is configured
  // and redirect to setup if needed
  next();
});

export default router;
