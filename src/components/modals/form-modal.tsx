import type { ComponentType, ReactNode } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/base/modal/modal";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

export function FormModal({
  isOpen,
  onOpenChange,
  title,
  description,
  icon,
  size = "lg",
  children,
  footer,
  className,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconComponent;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size={size} className={cx("bg-[#0b1120]", className)}>
      <ModalHeader title={title} description={description} icon={icon} closeLabel="Fechar" />
      <ModalBody>{children}</ModalBody>
      {footer ? <ModalFooter>{footer}</ModalFooter> : null}
    </Modal>
  );
}

export function ModalActions({
  onCancel,
  submitLabel = "Salvar",
  formId,
  danger = false,
  disabled = false,
}: {
  onCancel: () => void;
  submitLabel?: string;
  formId: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <Button variant="secondary" size="medium" onClick={onCancel} type="button">
        Cancelar
      </Button>
      <Button
        variant={danger ? "danger" : "primary"}
        size="medium"
        type="submit"
        form={formId}
        disabled={disabled}
      >
        {submitLabel}
      </Button>
    </>
  );
}
