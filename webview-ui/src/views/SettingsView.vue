<!-- webview-ui/src/views/SettingsView.vue -->
<!-- Version: 1.2 | Last Updated: 2025-07-08 -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { vscode } from '../vscode'; // Assuming vscode instance is available
import type { AssistantProfile } from '../types/assistantProfile'; // Import the type
import ProfileForm from '../components/ProfileForm.vue'; // Import the form component

const profiles = ref<AssistantProfile[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);

// State for managing the form visibility and mode
const showForm = ref(false);
const editingProfile = ref<AssistantProfile | null>(null);

// Function to request profiles from the extension
function getProfiles() {
  isLoading.value = true;
  error.value = null;
  try {
    console.log('[SettingsView] Requesting profiles...');
    vscode.postMessage({ command: 'getAssistantProfiles' });
    // Remove mock data logic
  } catch (e) {
    console.error('[SettingsView] Error posting getProfiles message:', e);
    error.value = 'Failed to communicate with the extension to get profiles.';
    isLoading.value = false;
  }
}

// Function to handle adding a new profile
function addProfile() {
  console.log('[SettingsView] Add Profile button clicked');
  editingProfile.value = null; // Ensure we are in create mode
  showForm.value = true;
}

// Function to handle editing a profile
function editProfile(profile: AssistantProfile) {
  console.log(`[SettingsView] Edit Profile button clicked for ID: ${profile.id}`);
  // Pass the actual profile object for editing
  editingProfile.value = profile;
  showForm.value = true;
}

// Function to handle deleting a profile
function deleteProfile(profileId: string) {
  console.log(`[SettingsView] Attempting to delete profile ID: ${profileId}`);
  // Basic confirmation
  if (confirm('Are you sure you want to delete this profile? This cannot be undone.')) {
      try {
        vscode.postMessage({ command: 'deleteAssistantProfile', payload: { profileId } });
        // UI will update when assistantProfileDeleted message is received
      } catch (e) {
        console.error('[SettingsView] Error posting deleteProfile message:', e);
        error.value = 'Failed to communicate with the extension to delete profile.';
      }
  }
}

// Function to handle the save event from ProfileForm
function handleSaveProfile(profile: AssistantProfile) {
  console.log('[SettingsView] Saving profile:', profile);
  error.value = null; // Clear previous errors
  try {
    if (editingProfile.value) {
      // Update existing profile
      vscode.postMessage({ command: 'updateAssistantProfile', payload: profile });
    } else {
      // Add new profile
      vscode.postMessage({ command: 'addAssistantProfile', payload: profile });
    }
    // Form is hidden via message response or could be hidden optimistically
    // showForm.value = false; 
  } catch (e) {
      console.error('[SettingsView] Error posting save/update message:', e);
      error.value = 'Failed to communicate with the extension to save profile.';
      // Keep form open on error?
  }
}

// Function to handle the cancel event from ProfileForm
function handleCancelForm() {
  showForm.value = false;
  editingProfile.value = null;
}

// Message listener for updates from the extension
const messageListener = (event: MessageEvent) => {
  const message = event.data;
  console.log('[SettingsView] Received message:', message);
  switch (message.command) {
    case 'assistantProfilesList':
      profiles.value = message.payload || [];
      isLoading.value = false;
      error.value = null;
      break;
    case 'assistantProfileDeleted':
      if (message.payload.success) {
        // Remove the profile from the local list immediately for responsiveness
        profiles.value = profiles.value.filter((p: AssistantProfile) => p.id !== message.payload.profileId);
        // Alternatively, call getProfiles() again, but this is faster for the UI
      } else {
        error.value = `Failed to delete profile: ${message.payload.error || 'Unknown error'}`;
        // Optionally show a more prominent error to the user
      }
      break;
    case 'assistantProfileAdded':
      if (message.payload.success) {
        // Add to list or refetch
        // profiles.value.push(message.payload.profile);
        getProfiles(); // Easiest way to ensure consistency after add
        showForm.value = false; // Close form on success
      } else {
         error.value = `Failed to add profile: ${message.payload.error || 'Unknown error'}`;
      }
      break;
     case 'assistantProfileUpdated':
       if (message.payload.success) {
         // Update in list or refetch
         getProfiles(); // Easiest way to ensure consistency after update
         showForm.value = false; // Close form on success
       } else {
          error.value = `Failed to update profile: ${message.payload.error || 'Unknown error'}`;
       }
       break;
    case 'error': // Handle general errors from the backend
        if (message.payload?.source?.startsWith('handle') && message.payload?.source?.includes('AssistantProfile')) {
             error.value = message.payload.message || 'An unknown error occurred while managing profiles.';
        }
      break;
  }
};

onMounted(() => {
  window.addEventListener('message', messageListener);
  getProfiles(); // Fetch profiles when component mounts
});

onUnmounted(() => {
  window.removeEventListener('message', messageListener);
});

</script>

<template>
  <div class="p-4 h-full flex flex-col text-[var(--vscode-foreground)]">
    <!-- Show Form Overlay -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <ProfileForm 
            :profile="editingProfile"
            @save="handleSaveProfile"
            @cancel="handleCancelForm"
            class="w-full max-w-2xl max-h-[90vh] overflow-y-auto" 
        />
    </div>

    <!-- Main Settings View Content -->
    <div :class="{ 'blur-sm pointer-events-none': showForm }"> 
        <h1 class="text-xl font-semibold mb-4">Assistant Profiles</h1>

        <div class="mb-4 flex justify-end">
          <button
            @click="addProfile"
            class="px-4 py-2 bg-[var(--vscode-button-background)] text-[var(--vscode-button-foreground)] rounded hover:bg-[var(--vscode-button-hoverBackground)] transition-colors"
            :disabled="showForm" 
          >
            Add New Profile
          </button>
        </div>

        <div v-if="isLoading" class="flex-grow flex items-center justify-center">
          <p>Loading profiles...</p>
          <!-- TODO: Add a better loading indicator -->
        </div>

        <div v-else-if="error && !showForm" class="text-red-500 p-2 border border-red-500 rounded bg-red-500/10 mb-4">
          <p>Error: {{ error }}</p>
        </div>

        <div v-if="!isLoading && profiles.length === 0 && !error" class="flex-grow flex items-center justify-center">
          <p>No assistant profiles configured yet.</p>
        </div>

        <div v-if="!isLoading && profiles.length > 0" class="flex-grow overflow-y-auto">
          <ul class="space-y-3">
            <li
              v-for="profile in profiles"
              :key="profile.id" // Ensure key is bound
              class="p-3 border border-[var(--vscode-sideBar-border)] rounded bg-[var(--vscode-sideBar-background)] flex justify-between items-center"
            >
              <div>
                <h2 class="font-medium">{{ profile.name }}</h2>
                <p class="text-sm text-[var(--vscode-descriptionForeground)]">{{ profile.description }}</p>
                <!-- Optionally display model info -->
                <!-- <p class="text-xs mt-1">Model: {{ profile.modelConfig.provider }} / {{ profile.modelConfig.modelId }}</p> -->
              </div>
              <div class="flex space-x-2">
                <button
                  @click="editProfile(profile)" 
                  :disabled="showForm"
                  class="p-1 text-xs bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] rounded hover:bg-[var(--vscode-button-secondaryHoverBackground)] transition-colors disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  @click="deleteProfile(profile.id)"
                  :disabled="showForm"
                  class="p-1 text-xs bg-[var(--vscode-errorForeground)] text-[var(--vscode-button-foreground)] rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </li>
          </ul>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles if needed */
</style> 