import { createFileRoute, Link } from "@tanstack/react-router";
import type { Difficulty } from "../solo/difficulty";

export const Route = createFileRoute("/")({
	component: HomePage,
});

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
	{ value: "easy", label: "Facile" },
	{ value: "normal", label: "Normal" },
	{ value: "hard", label: "Difficile" },
];

function HomePage() {
	return (
		<div data-testid="home-page">
			<h1>Pazaak</h1>
			<p>Choisis une difficulté :</p>
			{DIFFICULTIES.map((d) => (
				<Link
					key={d.value}
					to="/solo"
					search={{ difficulty: d.value }}
					data-testid={`play-solo-${d.value}`}
				>
					{d.label}
				</Link>
			))}
		</div>
	);
}
