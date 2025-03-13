from openai import OpenAI

client = OpenAI(
  api_key=secrets

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Provide a list of all scores, holes 1 - 18, for Connor from the attached scorecard. Provide the output as json key value pairs with the hold number and Bobby's score for that hole. If you are unsure on a particular hole, respond with Unk."},
            {
                "type": "image_url",
                "image_url": {
                    "url": "https://live.staticflickr.com/65535/54384461051_d070850925.jpg",
                },
            },
        ],
    }],
)

print(response.choices[0].message.content)