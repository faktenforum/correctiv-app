import { $showModal } from 'nativescript-vue';
import JoinFlowModal from '../views/modals/JoinFlowModal.vue';

/** "Become a supporter" — callable from anywhere (modal, fullscreen). */
export function useJoinFlow() {
  function openJoinFlow() {
    return $showModal(JoinFlowModal, { fullscreen: true });
  }
  return { openJoinFlow };
}
