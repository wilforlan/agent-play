agent-play

a platform to view your agent workflow in a 2D game view in realtime.

This will have a UI look like the design of a server, with object representation of databases, third party APIs, model collections, and other important structures that look like community amenities. Then the players should be the connected agents that acts as AI agents within the system. The full system which will be the World View will be where the agent visibly lives and moves around. 

Supports
- Single Agent Center: interfaces to see what the agent is doing in realtime, which will 
- Multi-Agent Interactions: implement interface that shows communication between multiple connected agents 
- Watch Only: the admin should only be able to watch the interaction of the agent within the “World View”
- Callouts: Agent players should have callouts that allows them to show their thoughts, how it connects to new ones, with buttons to show more info if the metadata is provided
- Live Tracks: Agents should be able to move from one structure point to another structure and back home, with a log of their movement like travel path that can be played back


The agent play should feature a developer sdk that allows the developer to attach their agent server to agent-play for preview, initialise their api keys, display settings, colour themes and while the agent server is started, a link to the agent-play preview UI should be generated, and this should allow the developer see a watch only view to how their agents are all interacting.


Tools

Preview UI: custom **Multiverse** Canvas 2D runtime in `play-sdk/preview-ui/` (no external game engine dependency).

https://github.com/Nurgak/Cube-engine



{
  messages: [
    HumanMessage {
      "id": "f8ff7542-3a64-4063-98b5-b7327809da4e",
      "content": "Search for information about the capital of France and calculate the result of 2 + 2",
      "additional_kwargs": {},
      "response_metadata": {}
    },
    AIMessage {
      "id": "chatcmpl-DMN6eyii1c4TVJEGAF0j3t15yfwcy",
      "content": "",
      "name": "langchain-agent",
      "additional_kwargs": {
        "tool_calls": [
          {
            "id": "call_bl6yfxw1CWGr03xhr9tr2pHa",
            "type": "function",
            "function": "[Object]"
          },
          {
            "id": "call_LHYzK0e7tadA722GBdT7PyFf",
            "type": "function",
            "function": "[Object]"
          }
        ]
      },
      "response_metadata": {
        "tokenUsage": {
          "promptTokens": 111,
          "completionTokens": 47,
          "totalTokens": 158
        },
        "finish_reason": "tool_calls",
        "model_provider": "openai",
        "model_name": "gpt-4.1-2025-04-14",
        "usage": {
          "prompt_tokens": 111,
          "completion_tokens": 47,
          "total_tokens": 158,
          "prompt_tokens_details": {
            "cached_tokens": 0,
            "audio_tokens": 0
          },
          "completion_tokens_details": {
            "reasoning_tokens": 0,
            "audio_tokens": 0,
            "accepted_prediction_tokens": 0,
            "rejected_prediction_tokens": 0
          }
        },
        "system_fingerprint": "fp_fd4d596ca2"
      },
      "tool_calls": [
        {
          "name": "search",
          "args": {
            "query": "capital of France"
          },
          "type": "tool_call",
          "id": "call_bl6yfxw1CWGr03xhr9tr2pHa"
        },
        {
          "name": "calculate",
          "args": {
            "expression": "2 + 2"
          },
          "type": "tool_call",
          "id": "call_LHYzK0e7tadA722GBdT7PyFf"
        }
      ],
      "invalid_tool_calls": [],
      "usage_metadata": {
        "output_tokens": 47,
        "input_tokens": 111,
        "total_tokens": 158,
        "input_token_details": {
          "audio": 0,
          "cache_read": 0
        },
        "output_token_details": {
          "audio": 0,
          "reasoning": 0
        }
      }
    },
    ToolMessage {
      "id": "c88e4d70-0acc-4bd2-977b-d1bbe49884d5",
      "content": "Results for: capital of France",
      "name": "search",
      "additional_kwargs": {},
      "response_metadata": {},
      "tool_call_id": "call_bl6yfxw1CWGr03xhr9tr2pHa"
    },
    ToolMessage {
      "id": "cefa8a04-53d3-46fc-8bda-f2c35606d31a",
      "content": "Result of: 2 + 2",
      "name": "calculate",
      "additional_kwargs": {},
      "response_metadata": {},
      "tool_call_id": "call_LHYzK0e7tadA722GBdT7PyFf"
    },
    AIMessage {
      "id": "chatcmpl-DMN6fMWhdgJTFtR6ZdusIqtaPhziH",
      "content": "The capital of France is Paris. The result of 2 + 2 is 4.",
      "name": "langchain-agent",
      "additional_kwargs": {},
      "response_metadata": {
        "tokenUsage": {
          "promptTokens": 190,
          "completionTokens": 20,
          "totalTokens": 210
        },
        "finish_reason": "stop",
        "model_provider": "openai",
        "model_name": "gpt-4.1-2025-04-14",
        "usage": {
          "prompt_tokens": 190,
          "completion_tokens": 20,
          "total_tokens": 210,
          "prompt_tokens_details": {
            "cached_tokens": 0,
            "audio_tokens": 0
          },
          "completion_tokens_details": {
            "reasoning_tokens": 0,
            "audio_tokens": 0,
            "accepted_prediction_tokens": 0,
            "rejected_prediction_tokens": 0
          }
        },
        "system_fingerprint": "fp_fd4d596ca2"
      },
      "tool_calls": [],
      "invalid_tool_calls": [],
      "usage_metadata": {
        "output_tokens": 20,
        "input_tokens": 190,
        "total_tokens": 210,
        "input_token_details": {
          "audio": 0,
          "cache_read": 0
        },
        "output_token_details": {
          "audio": 0,
          "reasoning": 0
        }
      }
    }
  ]
}
✨  Done in 4.82s.
williamsisaac@Isaacs-MacBook-Pro play-sdk % 