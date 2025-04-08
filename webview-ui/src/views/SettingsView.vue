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
function openAddProfileForm() {
  console.log('[SettingsView] Open Add Profile Form');
  editingProfile.value = null; // Ensure we are in create mode
  error.value = null; // Clear previous errors when opening form
  showForm.value = true;
}

// Function to handle editing a profile
function openEditProfileForm(profile: AssistantProfile) {
  console.log(`[SettingsView] Open Edit Profile Form for ID: ${profile.id}`);
  // Pass a deep copy to prevent accidental modification before saving
  editingProfile.value = JSON.parse(JSON.stringify(profile));
  error.value = null; // Clear previous errors when opening form
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
function handleSaveProfile(profileData: AssistantProfile) {
  console.log('[SettingsView] Saving profile:', profileData);
  error.value = null; // Clear previous errors
  try {
    if (editingProfile.value) {
      // Update existing profile
      console.log(` -> Sending updateAssistantProfile for ID: ${profileData.id}`);
      vscode.postMessage({ command: 'updateAssistantProfile', payload: profileData });
    } else {
      // Add new profile
      console.log(` -> Sending addAssistantProfile for ID: ${profileData.id}`);
      vscode.postMessage({ command: 'addAssistantProfile', payload: profileData });
    }
    // Keep form open, let message handler close it on success
  } catch (e) {
      console.error('[SettingsView] Error posting save/update message:', e);
      error.value = 'Failed to communicate with the extension to save profile.';
      // Keep form open on error
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
        error.value = null; // Clear error on successful delete
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
        editingProfile.value = null; 
        error.value = null;
      } else {
         error.value = `Failed to add profile: ${message.payload.error || 'Unknown error'}`;
      }
      break;
     case 'assistantProfileUpdated':
       if (message.payload.success) {
         // Update in list or refetch
         getProfiles(); // Easiest way to ensure consistency after update
         showForm.value = false; // Close form on success
         editingProfile.value = null;
         error.value = null;
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
  <div class="p-4 h-full flex flex-col text-[var(--vscode-foreground)] relative overflow-hidden">
    <!-- Show Form Overlay using Teleport for better stacking context -->
    <Teleport to="body">
        <div v-if="showForm" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4 transition-opacity duration-200" @click.self="handleCancelForm">
            <ProfileForm 
                :profile="editingProfile"
                @save="handleSaveProfile"
                @cancel="handleCancelForm"
                class="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--vscode-sideBar-background)] rounded-lg shadow-xl border border-[var(--vscode-input-border)]"
            />
        </div>
    </Teleport>

    <!-- Main Settings View Content -->
    <!-- Apply blur only when form is shown -->
    <div :class="{ 'blur-sm': showForm }">
        <h1 class="text-xl font-semibold mb-4">Assistant Profiles</h1>

        <!-- Error display area (moved outside the loading/empty checks) -->
         <div v-if="error && !isLoading" class="text-red-500 p-3 border border-red-600 rounded bg-red-900/20 mb-4 text-sm">
          <p><strong>Error:</strong> {{ error }}</p>
        </div>

        <div class="mb-4 flex justify-end">
          <button
            @click="openAddProfileForm" 
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

        <div v-else-if="profiles.length === 0" class="flex-grow flex items-center justify-center">
          <p>No assistant profiles configured yet. Click 'Add New Profile' to create one.</p>
        </div>

        <div v-else class="flex-grow overflow-y-auto pb-4 custom-scrollbar pr-1">
          <ul class="space-y-3">
            <li
              v-for="profile in profiles"
              :key="profile.id"
              class="p-3 border border-[var(--vscode-sideBar-border)] rounded bg-[var(--vscode-sideBar-background)] flex justify-between items-center group hover:border-[var(--vscode-focusBorder)] transition-colors duration-150"
            >
              <div class="flex-grow mr-4 overflow-hidden">
                <h2 class="font-medium truncate" :title="profile.name">{{ profile.name }}</h2>
                <p class="text-sm text-[var(--vscode-descriptionForeground)] truncate" :title="profile.description">{{ profile.description || 'No description'}}</p>
                 <!-- Display model info -->
                 <p class="text-xs text-[var(--vscode-disabledForeground)] mt-1 truncate" :title="`${profile.modelConfig.provider} / ${profile.modelConfig.modelId}`">
                    Model: {{ profile.modelConfig.provider }} / {{ profile.modelConfig.modelId }}
                 </p>
              </div>
              <div class="flex space-x-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  @click="openEditProfileForm(profile)" 
                  :disabled="showForm"
                  class="p-1 text-xs bg-[var(--vscode-button-secondaryBackground)] text-[var(--vscode-button-secondaryForeground)] rounded hover:bg-[var(--vscode-button-secondaryHoverBackground)] transition-colors disabled:opacity-50"
                  title="Edit Profile"
                >
                  <span class="i-carbon-edit block"></span> <!-- Icon example -->
                </button>
                <button
                  @click="deleteProfile(profile.id)"
                  :disabled="showForm"
                  class="p-1 text-xs bg-[var(--vscode-errorForeground)] text-[var(--vscode-button-foreground)] rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                  title="Delete Profile"
                >
                   <span class="i-carbon-trash-can block"></span> <!-- Icon example -->
                </button>
              </div>
            </li>
          </ul>
        </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--vscode-scrollbarSlider-background);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--vscode-scrollbarSlider-hoverBackground);
}
.custom-scrollbar::-webkit-scrollbar-thumb:active {
  background: var(--vscode-scrollbarSlider-activeBackground);
}
</style> 