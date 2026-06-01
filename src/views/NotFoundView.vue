<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <div class="text-center max-w-md">
      <!-- Illustration -->
      <div class="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20 mb-6">
        <svg class="h-12 w-12 text-primary-700 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <p class="text-7xl font-black text-primary-700 dark:text-primary-400 mb-4">404</p>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Page Not Found</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-8">
        The page you are looking for does not exist or has been moved.
      </p>

      <RouterLink to="/dashboard" class="btn-primary">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Back to Dashboard
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
// No logic needed for 404 page
</script>
