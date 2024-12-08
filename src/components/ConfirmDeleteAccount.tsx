"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { UserX } from "lucide-react";
import { useQueryState } from "nuqs";
import CustomButton from "./Button";

  
  export default function ConfirmDeleteAccount() {
    const [query, setQuery] = useQueryState("action");
    const isOpen = query === "disable_account";
    return (
      <AlertDialog open={isOpen} onOpenChange={(open) => setQuery(open ? "delete_account" : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="bg-red-500/20 text-white p-2 rounded-md w-fit">
              <UserX className="w-6 h-6 text-red-500" />
            </AlertDialogTitle>
            <AlertDialogTitle>
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>
              <CustomButton>
                Continue
              </CustomButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }