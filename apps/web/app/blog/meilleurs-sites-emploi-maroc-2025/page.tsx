import Link from "next/link";
import { Container } from "@workspace/ui/components/container";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { MarkdownRenderer } from "@/components/ui/markdown/markdown-renderer";
import { SerrbiMark } from "@/components/SerrbiMark";

export const metadata = {
  title: "Meilleurs sites pour trouver un emploi au Maroc (Guide pratique 2025)",
  description:
    "Découvrez les principaux sites marocains et internationaux pour trouver un emploi au Maroc et comment en tirer parti étape par étape.",
  alternates: {
    canonical: "/blog/meilleurs-sites-emploi-maroc-2025",
  },
} as const;

const content = `# Meilleurs sites pour trouver un emploi au Maroc (Guide pratique 2025)

Chercher un emploi au Maroc en 2025 ne se limite plus aux contacts personnels et à la famille. Les plateformes et sites web jouent un rôle central. Celui qui sait où chercher et comment utiliser ces plateformes augmente fortement ses chances de réussite par rapport à quelqu’un qui parcourt des annonces au hasard.

Cet article s’adresse aux étudiants, jeunes diplômés et professionnels souhaitant une meilleure opportunité au Maroc ou à l’étranger. Vous allez découvrir les sites fiables les plus utiles, leurs avantages et comment en tirer profit étape par étape, avec des conseils concrets. Lisez tranquillement, choisissez les plateformes adaptées à votre objectif et commencez dès aujourd’hui.

---

## Comment choisir le bon site d’emploi au Maroc ?

Le choix pertinent du site vous fait gagner beaucoup de temps et réduit le risque de tomber sur des annonces obsolètes ou douteuses. Au lieu d’ouvrir des dizaines de pages sans résultat, concentrez‑vous sur des plateformes ciblées.

Première question à se poser : **quel type d’offres publie ce site ?**

Certains sites sont orientés concours et secteur public, d’autres le privé, le saisonnier, ou le travail à distance. Si vous cherchez un concours de la fonction publique, tournez‑vous vers [Emploi‑Public.ma](https://www.emploi-public.ma/) ou [Alwadifa Maroc](https://alwadifa-maroc.com/) plutôt que des plateformes généralistes du privé.

Deuxième point : **la réputation et la crédibilité**. Les sites reconnus au Maroc mentionnent généralement la date de publication, le nom de l’entreprise, la méthode de candidature, et parfois un lien officiel. Tapez le nom du site sur Google avec “avis” ou “expériences” pour voir les retours, ou visitez des sources professionnelles comme [Dreamjob.ma](https://www.dreamjob.ma/emploi/%D9%81%D8%B1%D8%B5-%D8%B9%D9%85%D9%84-%D9%81%D9%8A-%D8%A7%D9%84%D9%85%D8%BA%D8%B1%D8%A8/).

Troisième point : **la facilité d’usage** dans la langue que vous maîtrisez (FR/AR/EN).  
Quatrième point : **la capacité du site à conserver vos données** (compte, CV, alertes e‑mail).

Plus vos plateformes sont claires, fiables et simples, plus votre recherche d’emploi devient une routine efficace.

---

## Définissez votre objectif avant de choisir les sites

Un étudiant cherchant un stage n’a pas les mêmes besoins qu’un comptable avec dix ans d’expérience. Quelqu’un visant la fonction publique diffère de celui qui veut un poste en télétravail dans la tech.

Avant d’ouvrir des sites, notez :

- Domaine ciblé : compta, développement, ventes, enseignement, agroalimentaire.  
- Niveau : stage, part‑time, full‑time, public.  
- Ville/région souhaitée, ou ouverture à l’étranger / télétravail.

Ensuite, choisissez des plateformes adaptées à cet objectif.

---

## Privilégiez les sites fiables et mis à jour

Les sites fiables indiquent en général :

- Date de publication  
- Date limite de candidature  
- Nom de l’organisme + lien/e‑mail officiel

Évitez les annonces suspectes (paiement/“dossier”). Vérifiez l’offre sur le site officiel de l’entreprise.

---

## Variez vos sources

Le marché est divers et chaque site ne couvre qu’une partie des offres. Idéalement, suivez 2 à 4 plateformes principales, 15–20 min par jour, et **postulez immédiatement** aux offres pertinentes.

---

## Les meilleurs sites marocains

### Alwadifa Maroc  
[Alwadifa Maroc](https://alwadifa-maroc.com/) est très connu pour les concours publics (ministères, collectivités, établissements publics) et publie aussi du privé.

### Emploi‑Public.ma  
[Emploi‑Public.ma](https://www.emploi-public.ma/) est le portail officiel du public. Créez un compte, importez vos documents (PDF), suivez vos candidatures.

### Almehan.ma  
[Almehan.ma](https://www.almehan.ma/) agrège des offres de nombreux sites. Recherchez par mots‑clés et villes, activez les alertes.

### Tanqeeb Maroc  
[Tanqeeb](https://morocco.tanqeeb.com/ar) propose un très grand nombre d’annonces et des filtres avancés (ville/expérience/salaire/contrat) + un outil d’analyse de CV.

### TARGIR et plateformes locales  
Coaching, ateliers, formations courtes et contenus pratiques (CV/lettres…).

---

## Les plateformes internationales utiles

### LinkedIn  
[LinkedIn](https://ma.linkedin.com/jobs) est un réseau professionnel. Profil soigné, groupes locaux, suivi d’entreprises et alertes : votre visibilité augmente.

### Bayt.com et Naukrigulf (Gulf)  
[Bayt](https://www.bayt.com/ar/morocco/jobs/) et Naukrigulf couvrent le Maroc et le Golfe, ainsi que le télétravail. Méfiez‑vous des annonces payantes (arnaques).

### En tirer profit même sans résultat immédiat  
Repérez les compétences les plus demandées (ex. React, Laravel) et comblez les lacunes (langues/outils/certifications). Mettez à jour votre CV, revenez sur les plateformes, et persévérez.

---

## Conclusion : passez à l’action

1. Choisissez 3 sites et créez des comptes complets.  
2. Mettez à jour votre CV (FR/AR/EN).  
3. Consacrez 20 minutes par jour pour postuler.  
4. Travaillez les compétences récurrentes vues dans les offres.
`;

export default function BlogPostFR() {
  return (
    <Container className="py-10">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-2 text-xs text-muted-foreground">Nov 14, 2025</div>
        <h1 className="mb-3 text-3xl font-bold md:text-5xl">
          Meilleurs sites pour trouver un emploi au Maroc (Guide pratique 2025)
        </h1>
        <div className="flex gap-3 justify-center items-center pt-2">
          <Avatar>
            <AvatarImage src="" alt="Serrbi Editorial" />
            <AvatarFallback className="flex justify-center items-center">
              <SerrbiMark width={18} height={18} />
            </AvatarFallback>
          </Avatar>
          <div className="text-sm text-left">
            <div className="font-medium">Serrbi Editorial</div>
            <div className="text-muted-foreground">Rédaction</div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <MarkdownRenderer source={content} />
        <div className="flex justify-center mt-8">
          <Button asChild className="px-5 rounded-lg">
            <Link href="/jobs">Parcourir les offres sur Serrbi</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}


