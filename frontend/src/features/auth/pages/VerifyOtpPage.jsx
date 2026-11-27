import React, { useState, useEffect } from "react";
import OtpInput from "../components/OtpInput";
import { AuthCardSkeleton } from "../components/AuthSkeleton";

export default function VerifyOtpPage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <AuthCardSkeleton />;
  }

  return <OtpInput />;
}
