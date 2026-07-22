from transformers import pipeline


IMAGE_PATH = "static/dataSamplePresition/mock_rx_01_respiratory.png"


def main():
    pipe = pipeline(
        "image-text-to-text",
        model="deepseek-ai/DeepSeek-OCR",
        trust_remote_code=True,
        device_map="auto",
    )

    result = pipe(
        {
            "image": IMAGE_PATH,
            "text": (
                "Extract all prescription text from this image. "
                "Return patient info, diagnosis, medications, dosage, and doctor notes."
            ),
        }
    )
    print(result)


if __name__ == "__main__":
    main()
