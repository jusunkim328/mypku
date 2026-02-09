import RecipesClient from "@/components/pages/RecipesClient";

export const metadata = {
  title: "Recipes - MyPKU",
  description: "Browse PKU-friendly recipes with low phenylalanine content",
};

export default function RecipesPage() {
  return <RecipesClient />;
}
