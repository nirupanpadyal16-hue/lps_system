import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-2 px-6 bg-white border-t border-slate-200 text-center text-[10px]  font-semibold text-black  uppercase">
      <div className="flex flex-col md:flex-row items-center justify-end gap-1">
        <span>CIE AUTOMOTIVE © {currentYear}</span>
        <span className="hidden md:inline text-ind-border">|</span>
        <span>DEVELOPED BY NEXVITECH INDIA PVT. LTD.</span>
      </div>
    </footer>
  );
};
