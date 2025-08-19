import { useState } from "react";

type ModalType = 
  | "createItem" 
  | "inviteMembers" 
  | "createProject" 
  | "createTeam"
  | "editItem"
  | "deleteItem"
  | "addTeamMembers";

export function useModal() {
  const [modalType, setModalType] = useState<ModalType | null>(null);
  const [modalProps, setModalProps] = useState<any>(null);
  
  const openModal = (type: ModalType, props?: any) => {
    console.log("Opening modal:", type, props);
    setModalType(type);
    setModalProps(props || null);
  };
  
  const closeModal = () => {
    console.log("Closing modal");
    setModalType(null);
    setModalProps(null);
  };
  
  return {
    modalType,
    modalProps,
    openModal,
    closeModal,
    isOpen: modalType !== null,
  };
}
