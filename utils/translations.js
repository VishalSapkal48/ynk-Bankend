const translations = {
  en: {
    shop_possession: 'Do you have possession of the shop?',
    shop_vacant: 'Is the shop completely vacant?',
    shop_photo: 'Upload a photo of the shop',
    shop_video: 'Upload a video of the shop',
    shutter_size: 'What is the size of the shop shutter?',
    electrical_supply: 'Does the shop have electrical supply?',
    light_photo: 'Upload a photo of the lights turned on',
    measurement_tape_knowledge: 'Do you have knowledge about measurement tape?',
    bring_tape: 'Will you bring a measurement tape?',
    google_location: 'Please provide the Google location link',
    shop_photos: 'Upload photos of the shop from different angles',
    drainage_connection: 'Does the shop have a drainage connection?',
    drainage_photo: 'Upload a photo of the drainage working',
    water_connection: 'Does the shop have a water connection?',
    water_photo: 'Upload a photo of the water connection working',
    water_availability: 'How often is water available?',
  },
  mr: {
    shop_possession: 'शॉपचा ताबा आपल्याकडे आला आहे का?',
    shop_vacant: 'शॉप पूर्णपणे मोकळा आहे का?',
    shop_photo: 'शॉपचा फोटो अपलोड करा',
    shop_video: 'शॉपचा व्हिडिओ अपलोड करा',
    shutter_size: 'शॉपचा शटर किती फूट आहे?',
    electrical_supply: 'शॉपमध्ये विजेचा पुरवठा आहे का?',
    light_photo: 'लाइट चालू असल्याचा फोटो अपलोड करा',
    measurement_tape_knowledge: 'सर तुम्हाला मेजरमेंट टेप बद्दल माहिती आहे का?',
    bring_tape: 'सर, मोजमाप टेप घेऊन याल का?',
    google_location: 'सर, मला Google चे लोकेेशन पाठवा',
    shop_photos: 'सर, पूर्ण शॉपचे वेगवेगळ्या अँगलने फोटो पाठवा',
    drainage_connection: 'शॉपमध्ये drainage कनेक्शन आहे का?',
    drainage_photo: 'drainage चालू असल्याचा फोटो अपलोड करा',
    water_connection: 'शॉपमध्ये water कनेक्शन आहे का?',
    water_photo: 'पाणी चालू असल्याचा फोटो अपलोड करा',
    water_availability: 'पाणी किती वेळ असते?',
  },
};

const getTranslation = (key, lang) => translations[lang][key] || key;

export { getTranslation };