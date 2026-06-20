"""Expose a custom Python agent over InferNet."""

from infernet import serve_agent


@serve_agent(name="echo-agent", model="custom", price_per_call="1")
def echo_agent(task: str, max_tokens: int) -> str:
    _ = max_tokens
    return f"echo: {task}"


if __name__ == "__main__":
    echo_agent.serve()
