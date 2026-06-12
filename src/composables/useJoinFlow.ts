import { $showModal } from 'nativescript-vue';
import JoinFlowModal from '../views/modals/JoinFlowModal.vue';

/** „Unterstützer:in werden“ — von überall aufrufbar (Modal, fullscreen). */
export function useJoinFlow() {
  function openJoinFlow() {
    return $showModal(JoinFlowModal, { fullscreen: true });
  }
  return { openJoinFlow };
}
