import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<div data-testid="home-page">
			<h1>Pazaak</h1>
			<Link to="/solo" data-testid="play-solo">
				Jouer en solo
			</Link>
		</div>
	);
}
