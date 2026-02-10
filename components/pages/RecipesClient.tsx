"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Page, Navbar, Block, Button, Preloader } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import RecipeCategoryFilter from "@/components/recipes/RecipeCategoryFilter";
import RecipeList from "@/components/recipes/RecipeList";
import RecipeDetail from "@/components/recipes/RecipeDetail";
import Disclaimer from "@/components/common/Disclaimer";
import { useRecipes } from "@/hooks/useRecipes";
import { useRecipeFavorites } from "@/hooks/useRecipeFavorites";
import type { Recipe } from "@/types/recipe";

export default function RecipesClient() {
  const t = useTranslations("Recipes");
  const tCommon = useTranslations("Common");
  const {
    recipes,
    isLoading,
    selectedCategory,
    setCategory,
    searchQuery,
    setSearchQuery,
    fetchRecipeDetail,
  } = useRecipes();
  const { isFavorited, toggleFavorite } = useRecipeFavorites();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleSelectRecipe = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      const detail = await fetchRecipeDetail(id);
      setSelectedRecipe(detail);
      setDetailLoading(false);
    },
    [fetchRecipeDetail]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedRecipe(null);
  }, []);

  return (
    <Page>
      <Navbar
        title={t("title")}
        left={
          <Link href="/">
            <Button clear small>
              {tCommon("back")}
            </Button>
          </Link>
        }
      />

      <Block>
        <div className="space-y-4">
          <RecipeCategoryFilter
            selected={selectedCategory}
            onChange={setCategory}
          />

          <RecipeList
            recipes={recipes}
            isLoading={isLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isFavorited={isFavorited}
            onToggleFavorite={toggleFavorite}
            onSelectRecipe={handleSelectRecipe}
          />
        </div>
      </Block>

      <Disclaimer />

      {/* Detail modal */}
      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <Preloader />
        </div>
      )}

      {selectedRecipe && !detailLoading && (
        <RecipeDetail
          recipe={selectedRecipe}
          isFavorited={isFavorited(selectedRecipe.id)}
          onToggleFavorite={toggleFavorite}
          onClose={handleCloseDetail}
        />
      )}
    </Page>
  );
}
