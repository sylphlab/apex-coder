import { createRouter, createWebHashHistory } from 'vue-router';

// Import views (we will create these files next)
// import SetupView from '../views/SetupView.vue';
// import ChatView from '../views/ChatView.vue';

const routes = [
  {
    path: '/',
    redirect: '/chat', // Default to chat, logic in App.vue will redirect if not configured
  },
  {
    path: '/setup',
    name: 'Setup',
    // component: SetupView, // Uncomment when view is created
    component: () => import('../views/SetupView.vue'), // Lazy load
  },
  {
    path: '/chat',
    name: 'Chat',
    // component: ChatView, // Uncomment when view is created
     component: () => import('../views/ChatView.vue'), // Lazy load
  },
];

const router = createRouter({
  history: createWebHashHistory(), // Use hash history for simplicity in WebView
  routes,
});

export default router;