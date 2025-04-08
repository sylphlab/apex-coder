import '@unocss/reset/tailwind.css'; // Re-add Tailwind CSS reset from UnoCSS
import 'virtual:uno.css'; // Import UnoCSS entry point
import { createApp } from 'vue';
import { createPinia } from 'pinia'; // Import Pinia
import router from './router/index.ts'; // Re-added .ts extension
// import './style.css'; as it was deleted and UnoCSS handles base styles
import App from './App.vue';

const app = createApp(App);
const pinia = createPinia(); // Create Pinia instance

app.use(pinia); // Use Pinia
app.use(router); // Restore router usage
app.mount('#app');

// App mounted with router
