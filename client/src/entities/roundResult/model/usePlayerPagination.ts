import { useState } from 'react';
import { PLAYERS_PER_PAGE } from '../lib/gridLayout';

export const usePlayerPagination = <T>(players: T[]) => {
  const [currentPage, setCurrentPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(players.length / PLAYERS_PER_PAGE));
  const startIndex = currentPage * PLAYERS_PER_PAGE;
  const currentPlayers = players.slice(
    startIndex,
    startIndex + PLAYERS_PER_PAGE,
  );

  const goToPrevPage = () => setCurrentPage((prev) => Math.max(0, prev - 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));

  return {
    currentPage,
    totalPages,
    startIndex,
    currentPlayers,
    goToPrevPage,
    goToNextPage,
  };
};
