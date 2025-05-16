import React from "react";
import { Button } from "@/components/ui/button";
import { BsMicrosoft } from "react-icons/bs";
import { useMicrosoftAuth } from "@/hooks/use-microsoft-auth";

export function MicrosoftLoginButton() {
  const { loginWithMicrosoft, isRedirecting } = useMicrosoftAuth();

  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-2 border-gray-300 text-black bg-white hover:bg-gray-50 shadow-sm transition-all hover:shadow-md py-6"
      onClick={loginWithMicrosoft}
      disabled={isRedirecting}
    >
      <BsMicrosoft className="h-5 w-5 text-[#00A4EF]" />
      <span className="font-medium">
        {isRedirecting ? "Redirecting to Microsoft..." : "Sign in with Microsoft"}
      </span>
    </Button>
  );
}