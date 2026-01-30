import { useState } from 'react';
import { MOBILE_PLAYERS_PER_PAGE, PLAYERS_PER_PAGE } from '../lib/gridLayout';

export const usePlayerPagination = <T>(players: T[], isMobile: boolean) => {
  const [currentPage, setCurrentPage] = useState(0);

  const playerPerPage = isMobile ? MOBILE_PLAYERS_PER_PAGE : PLAYERS_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(players.length / playerPerPage));
  const startIndex = currentPage * playerPerPage;
  const currentPlayers = players.slice(startIndex, startIndex + playerPerPage);

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
