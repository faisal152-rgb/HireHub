import React, { useState, useEffect } from "react";
import ResetPasswordForm from "../components/ResetPasswordForm";
import { AuthCardSkeleton } from "../components/AuthSkeleton";

export default function ResetPasswordPage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <AuthCardSkeleton />;
  }

  return <ResetPasswordForm />;
}
