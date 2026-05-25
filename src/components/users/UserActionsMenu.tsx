import { useState } from "react";
import { Pencil, KeyRound, Ban, Trash2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditUserDialog } from "./EditUserDialog";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { DeactivateUserDialog } from "./DeactivateUserDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { TokenDialog } from "./TokenDialog";

interface UserActionsMenuProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    branch_id: string | null;
    role: string | null;
  };
  branches: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function UserActionsMenu({ user, branches, onSuccess }: UserActionsMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTokenOpen(true)}
          title="Token"
        >
          <Key className="h-4 w-4 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setEditOpen(true)}
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setPasswordOpen(true)}
          title="Cambiar Contraseña"
        >
          <KeyRound className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-600 hover:text-amber-600"
          onClick={() => setDeactivateOpen(true)}
          title="Anular"
        >
          <Ban className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <EditUserDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        user={user}
        branches={branches}
        onSuccess={onSuccess}
      />

      <ChangePasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        user={user}
        onSuccess={onSuccess}
      />

      <DeactivateUserDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        user={user}
        onSuccess={onSuccess}
      />

      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={user}
        onSuccess={onSuccess}
      />

      <TokenDialog
        open={tokenOpen}
        onOpenChange={setTokenOpen}
        user={user}
      />
    </>
  );
}
