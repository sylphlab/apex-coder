import '@unocss/reset/tailwind.css' // Re-add Tailwind CSS reset from UnoCSS
import 'virtual:uno.css' // Import UnoCSS entry point
import { createApp } from 'vue';
import router from './router'; // Import the router
// Removed import './style.css'; as it was deleted and UnoCSS handles base styles
import App from './App.vue';

const app = createApp(App);
app.use(router); // Use the router
app.mount('#app');
