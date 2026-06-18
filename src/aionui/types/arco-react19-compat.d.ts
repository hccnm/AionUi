import type React from 'react';
import type { ModalHookReturnType, ModalProps } from '@arco-design/web-react';

declare module '@arco-design/web-react' {
  type ModalStatic = {
    confirm: (props: any) => any;
    info: (props: any) => any;
    success: (props: any) => any;
    warning: (props: any) => any;
    error: (props: any) => any;
    config: (config: any) => void;
    destroyAll: () => void;
    useModal: () => ModalHookReturnType;
  };

  export const Modal: React.ComponentType<React.PropsWithChildren<ModalProps>> & ModalStatic;
}
