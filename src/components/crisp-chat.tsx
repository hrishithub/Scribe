"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
  useEffect(() => {
    Crisp.configure("30078721-daa7-4d31-b615-a76b9f96758d");
  }, []);

  return null;
}; 

//30078721-daa7-4d31-b615-a76b9f96758d