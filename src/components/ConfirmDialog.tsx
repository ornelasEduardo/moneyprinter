import {
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Text,
} from "doom-design-system";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader>
        <Text variant="h5" className="mb-0" style={{ color: "inherit" }}>
          {title}
        </Text>
      </ModalHeader>
      <ModalBody>
        <Text>{message}</Text>
      </ModalBody>
      <ModalFooter>
        <Flex justify="flex-end" gap={4}>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "primary" : "primary"}
            onClick={handleConfirm}
            disabled={isLoading}
            className={variant === "danger" ? "bg-error" : ""}
          >
            {isLoading ? "Processing..." : confirmText}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  );
}
