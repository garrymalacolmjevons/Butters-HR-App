import React from "react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-3 px-6 bg-neutral-800 text-neutral-300 text-center text-sm border-t border-neutral-700">
      <p>
        <span className="font-medium">Developed by Grey Gekko Incorporated</span>
        <span className="mx-2">•</span>
        <span>{currentYear} © All Rights Reserved</span>
      </p>
    </footer>
  );
}