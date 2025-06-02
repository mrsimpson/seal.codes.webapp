<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  text: string;
}>();

const isPressed = ref(false);

const handleMouseDown = () => {
  isPressed.value = true;
};

const handleMouseUp = () => {
  isPressed.value = false;
};
</script>

<template>
  <button
    class="wax-seal-button"
    :class="{ 'is-pressed': isPressed }"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    {{ text }}
  </button>
</template>

<style scoped>
.wax-seal-button {
  position: relative;
  padding: 1rem 2.5rem;
  font-size: 1.25rem;
  font-weight: 500;
  color: white;
  background-color: rgb(150, 26, 26);
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.wax-seal-button::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 9999px;
  background: rgb(150, 26, 26);
  opacity: 0;
  transition: all 0.3s ease;
}

.wax-seal-button:hover::before {
  opacity: 0.15;
  inset: -8px;
}

.wax-seal-button.is-pressed::before {
  opacity: 0.3;
  inset: -16px;
  border-radius: 9999px;
  filter: blur(4px);
}

/* Wax drips effect */
.wax-seal-button::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 9999px;
  background: rgb(150, 26, 26);
  clip-path: polygon(
    50% 0%, 
    55% -20%, 
    60% 0%,
    65% -15%,
    70% 0%,
    75% -10%,
    80% 0%,
    85% -5%,
    90% 0%,
    95% -8%,
    100% 0%,
    100% 100%,
    0% 100%,
    0% 0%,
    5% -12%,
    10% 0%,
    15% -18%,
    20% 0%,
    25% -10%,
    30% 0%,
    35% -20%,
    40% 0%,
    45% -15%
  );
  opacity: 0;
  transition: all 0.3s ease;
  z-index: -1;
}

.wax-seal-button:hover::after {
  opacity: 1;
  transform: scale(1.1);
}

.wax-seal-button.is-pressed::after {
  transform: scale(1.2);
  filter: blur(2px);
}
</style>