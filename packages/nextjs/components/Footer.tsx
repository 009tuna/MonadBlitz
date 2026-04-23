"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { SwitchTheme } from "~~/components/SwitchTheme";

export const Footer = () => {
  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto"></div>
          <SwitchTheme className="pointer-events-auto" />
        </div>
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-sm w-full">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="h-3 w-3 text-white" />
              </div>
              <span className="font-semibold">SpeakStream</span>
            </div>
            <span className="text-base-content/40">|</span>
            <span className="text-base-content/50">Built for Monad Blitz Kayseri Hackathon 2025</span>
            <span className="text-base-content/40">|</span>
            <span className="text-base-content/50">Pay per second you speak</span>
          </div>
        </ul>
      </div>
    </div>
  );
};
