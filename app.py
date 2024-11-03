from flask import Flask, request, jsonify, render_template
from transformers import (
    BertTokenizer, BertForSequenceClassification,
    GPT2Tokenizer, GPT2LMHeadModel,
    T5Tokenizer, T5ForConditionalGeneration,
    DistilBertTokenizer, DistilBertForSequenceClassification,
    ViTFeatureExtractor, ViTForImageClassification,
    WhisperProcessor, WhisperForConditionalGeneration
)
from PIL import Image
import torch

app = Flask(__name__)

# 首頁
@app.route('/')
def home():
    return render_template('index.html')

# 處理 NLP 請求
@app.route('/nlp', methods=['POST'])
def nlp():
    text = request.form['text']
    task = request.form['task']

    if task == "bert_classify":
        # 延遲加載 BERT 模型
        bert_tokenizer = BertTokenizer.from_pretrained("bert-base-uncased")
        bert_model = BertForSequenceClassification.from_pretrained("bert-base-uncased")
        inputs = bert_tokenizer(text, return_tensors='pt')
        outputs = bert_model(**inputs)
        result = torch.softmax(outputs.logits, dim=1).tolist()
    elif task == "gpt2_generate":
        # 延遲加載 GPT-2 模型
        gpt2_tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        gpt2_model = GPT2LMHeadModel.from_pretrained("gpt2")
        inputs = gpt2_tokenizer.encode(text, return_tensors='pt')
        outputs = gpt2_model.generate(inputs, max_length=50, num_return_sequences=1)
        result = gpt2_tokenizer.decode(outputs[0], skip_special_tokens=True)
    elif task == "t5_translate":
        # 延遲加載 T5 模型
        t5_tokenizer = T5Tokenizer.from_pretrained("t5-small")
        t5_model = T5ForConditionalGeneration.from_pretrained("t5-small")
        inputs = t5_tokenizer("translate English to French: " + text, return_tensors="pt")
        outputs = t5_model.generate(inputs.input_ids)
        result = t5_tokenizer.decode(outputs[0], skip_special_tokens=True)
    else:
        result = "未知的任務"

    return jsonify({"result": result})

# 處理圖像請求
@app.route('/image', methods=['POST'])
def image():
    image_file = request.files['image']
    task = request.form['task']
    image = Image.open(image_file)

    if task == "vit_classify":
        # 延遲加載 ViT 模型
        vit_processor = ViTFeatureExtractor.from_pretrained("google/vit-base-patch16-224")
        vit_model = ViTForImageClassification.from_pretrained("google/vit-base-patch16-224")
        inputs = vit_processor(images=image, return_tensors='pt')
        outputs = vit_model(**inputs)
        logits = outputs.logits
        predicted_class = logits.argmax(-1).item()
        result = f"Predicted class ID: {predicted_class}"
    else:
        result = "未知的圖像任務"

    return jsonify({"result": result})

# 啟動 Flask 伺服器
if __name__ == '__main__':
    app.run(debug=True,port=10000, host='0.0.0.0')
