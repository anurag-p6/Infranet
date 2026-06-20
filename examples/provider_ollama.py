"""Expose a local Ollama model as a shared InferNet agent."""

from infernet.adapters import OllamaAdapter
from infernet.serve import ServedAgent

if __name__ == "__main__":
    ServedAgent(
        name="ollama-general",
        model="llama3.2",
        adapter=OllamaAdapter(model="llama3.2"),
        price_per_call="10",
        manifest_path="manifests/ollama-general.json",
    ).serve()
