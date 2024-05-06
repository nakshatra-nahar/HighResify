import { newsAtom, showNewsModalAtom } from "@/atoms/newsAtom";
import { useAtomValue, useSetAtom } from "jotai";
import React from "react";

function Footer() {
  const setShowNewsModal = useSetAtom(showNewsModalAtom);
  const news = useAtomValue(newsAtom);

  return (
    <div className="p-2 text-center text-xs text-base-content/50">
      {news && !news?.data?.dontShow && (
        <button
          className="badge badge-neutral mb-2"
          onClick={() => setShowNewsModal(true)}>
          HighResify NEWS
        </button>
      )}
      <p>
        Copyright © {new Date().getFullYear()} -{" "}
        <a
          className="font-bold"
          href="https://github.com/HighResify/HighResify"
          target="_blank">
          HighResify
        </a>
      </p>
      <p>
        By{" "}
        <a
          href="https://github.com/HighResify"
          className="font-bold"
          target="_blank">
          The HighResify Team
        </a>
      </p>
    </div>
  );
}

export default Footer;
