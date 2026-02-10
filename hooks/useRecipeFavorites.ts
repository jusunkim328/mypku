"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDevAuthState } from "@/lib/devAuth";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocalFavoritesStore {
  favoriteIds: string[];
  toggle: (recipeId: string) => void;
}

const useLocalFavoritesStore = create<LocalFavoritesStore>()(
  persist(
    (set) => ({
      favoriteIds: [],
      toggle: (recipeId) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(recipeId)
            ? state.favoriteIds.filter((id) => id !== recipeId)
            : [...state.favoriteIds, recipeId],
        })),
    }),
    { name: "mypku-recipe-favorites" }
  )
);

interface UseRecipeFavoritesReturn {
  favorites: string[];
  isFavorited: (recipeId: string) => boolean;
  toggleFavorite: (recipeId: string) => Promise<void>;
  isLoading: boolean;
}

export function useRecipeFavorites(): UseRecipeFavoritesReturn {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const localStore = useLocalFavoritesStore();
  const [dbFavorites, setDbFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();
  const useLocal = !isAuthenticated || getDevAuthState().enabled;

  const fetchFavorites = useCallback(async () => {
    if (!user?.id || useLocal) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("recipe_favorites")
        .select("recipe_id")
        .eq("user_id", user.id);

      if (error) throw error;

      setDbFavorites((data ?? []).map((row) => String(row.recipe_id)));
    } catch (error) {
      console.error("Failed to fetch recipe favorites:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, useLocal]);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated && !useLocal) {
        fetchFavorites();
      } else {
        setIsLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, useLocal, fetchFavorites]);

  const favorites = useLocal ? localStore.favoriteIds : dbFavorites;

  const isFavorited = useCallback(
    (recipeId: string) => favorites.includes(recipeId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      if (useLocal) {
        localStore.toggle(recipeId);
        return;
      }

      if (!user?.id) return;

      const alreadyFavorited = dbFavorites.includes(recipeId);

      try {
        if (alreadyFavorited) {
          const { error } = await supabase
            .from("recipe_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("recipe_id", recipeId);

          if (error) throw error;

          setDbFavorites((prev) => prev.filter((id) => id !== recipeId));
        } else {
          const { error } = await supabase
            .from("recipe_favorites")
            .insert({ user_id: user.id, recipe_id: recipeId });

          if (error) throw error;

          setDbFavorites((prev) => [...prev, recipeId]);
        }
      } catch (error) {
        console.error("Failed to toggle recipe favorite:", error);
      }
    },
    [useLocal, user?.id, dbFavorites, localStore]
  );

  return {
    favorites,
    isFavorited,
    toggleFavorite,
    isLoading: isLoading || authLoading,
  };
}
