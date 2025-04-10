# from openai import OpenAI

# client = OpenAI(
#   api_key=""

# response = client.chat.completions.create(
#     model="gpt-4o-mini",
#     messages=[{
#         "role": "user",
#         "content": [
#             {"type": "text", "text": "Provide a list of all scores, holes 1 - 18, for Connor from the attached scorecard. Provide the output as json key value pairs with the hold number and Bobby's score for that hole. If you are unsure on a particular hole, respond with Unk."},
#             {
#                 "type": "image_url",
#                 "image_url": {
#                     "url": "https://live.staticflickr.com/65535/54384461051_d070850925.jpg",
#                 },
#             },
#         ],
#     }],
# )

# print(response.choices[0].message.content)

""" import http.client

conn = http.client.HTTPSConnection("api.golfcourseapi.com")
payload = ''
headers = {
  'Authorization': 'Key xxx'
}
conn.request("GET", "/v1/search?search_query=pinehurst", payload, headers)
res = conn.getresponse()
data = res.read()
print(data.decode("utf-8"))
 """

# from PIL import Image
# import requests
# from io import BytesIO
# import base64
# import glob, os

# size = 128, 128

# for infile in glob.glob("E:\\Projects\\Golf Smart Web Assets Draft\\img-test\\*.png"):
#     file, ext = os.path.splitext(infile)
#     with Image.open(infile) as im:
#         im.thumbnail(size)
#         im.save(file + ".thumbnail", "JPEG")


# from PIL import Image, ImageEnhance, ExifTags
# import requests
# from io import BytesIO
# import base64
# import glob, os

# size = 128, 128

# for infile in glob.glob("E:\\Projects\\Golf Smart Web Assets Draft\\Textract Raw Docs\\Test\\*.jpg"):
#     file, ext = os.path.splitext(infile)
#     with Image.open(infile) as im:                        

#         try:
#             for orientation in ExifTags.TAGS.keys():
#                 if ExifTags.TAGS[orientation] == 'Orientation':
#                     break
#             exif = im._getexif()
#             if exif is not None:
#                 orientation_value = exif.get(orientation)
#                 if orientation_value == 3:
#                     im = im.rotate(180, expand=True)
#                 elif orientation_value == 6:
#                     im = im.rotate(270, expand=True)
#                 elif orientation_value == 8:
#                     im = im.rotate(90, expand=True)
#         except Exception as e:
#             pass  # If anything fails with EXIF, continue without rotation

#         # Rotate portrait to landscape if necessary
#         if im.height > im.width:
#             im = im.rotate(270, expand=True)
        
#         # Convert to grayscale
#         im = im.convert("L")

#         # Enhance contrast and sharpness
#         enhancer_contrast = ImageEnhance.Contrast(im)
#         im = enhancer_contrast.enhance(2.0)  # Adjust contrast level

#         enhancer_sharpness = ImageEnhance.Sharpness(im)
#         im = enhancer_sharpness.enhance(2.0)  # Adjust sharpness level

#         # Save to BytesIO
#         output_buffer = BytesIO()
#         im.save(output_buffer, format="PNG")
#         output_buffer.seek(0)

#         # Convert to base64 for OpenAI API
#         base64_image = base64.b64encode(output_buffer.read()).decode("utf-8")
      
#         im.save(file + "_converted.jpg", "JPEG")