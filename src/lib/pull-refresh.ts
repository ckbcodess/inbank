"use client";

import { useEffect, useRef } from "react";

type Handler = () => Promise<void> | void;

/** Screens that can reload, newest last. Only the newest one answers a pull. */
const handlers: Array<{ current: Handler }> = [];

/**
 * Say that this screen has something to reload and how. A pull down at the top of the page runs it and holds the
 * indicator until it settles (return a promise). A screen that registers nothing is not pullable at all: no gesture,
 * no indicator, so a pull never promises a refresh the page cannot do.
 */
export function useRefreshHandler(fn: Handler) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    handlers.push(ref);
    return () => {
      handlers.splice(handlers.indexOf(ref), 1);
    };
  }, []);
}

export function currentRefreshHandler(): Handler | undefined {
  return handlers[handlers.length - 1]?.current;
}
