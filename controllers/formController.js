import Response from '../models/Response.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

// Helper function to properly decode UTF-8 text
const decodeUTF8 = (text) => {
  if (typeof text !== 'string') return text;
  
  try {
    // Check if text is already properly encoded
    if (text.match(/^[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0D80-\u0DFF\u0E00-\u0E7F\u0E80-\u0EFF\u0F00-\u0FFF\u1000-\u109F\u10A0-\u10FF\u1100-\u11FF\u1200-\u137F\u13A0-\u13FF\u1400-\u167F\u1680-\u169F\u16A0-\u16FF\u1700-\u171F\u1720-\u173F\u1740-\u175F\u1760-\u177F\u1780-\u17FF\u1800-\u18AF\u1900-\u194F\u1950-\u197F\u1980-\u19DF\u19E0-\u19FF\u1A00-\u1A1F\u1A20-\u1AAF\u1AB0-\u1AFF\u1B00-\u1B7F\u1B80-\u1BBF\u1BC0-\u1BFF\u1C00-\u1C4F\u1C50-\u1C7F\u1C80-\u1C8F\u1CC0-\u1CCF\u1CD0-\u1CFF\u1D00-\u1D7F\u1D80-\u1DBF\u1DC0-\u1DFF\u1E00-\u1EFF\u1F00-\u1FFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u20D0-\u20FF\u2100-\u214F\u2150-\u218F\u2190-\u21FF\u2200-\u22FF\u2300-\u23FF\u2400-\u243F\u2440-\u245F\u2460-\u24FF\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2600-\u26FF\u2700-\u27BF\u27C0-\u27EF\u27F0-\u27FF\u2800-\u28FF\u2900-\u297F\u2980-\u29FF\u2A00-\u2AFF\u2B00-\u2BFF\u2C00-\u2C5F\u2C60-\u2C7F\u2C80-\u2CFF\u2D00-\u2D2F\u2D30-\u2D7F\u2D80-\u2DDF\u2DE0-\u2DFF\u2E00-\u2E7F\u2E80-\u2EFF\u2F00-\u2FDF\u2FF0-\u2FFF\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u3100-\u312F\u3130-\u318F\u3190-\u319F\u31A0-\u31BF\u31C0-\u31EF\u31F0-\u31FF\u3200-\u32FF\u3300-\u33FF\u3400-\u4DBF\u4DC0-\u4DFF\u4E00-\u9FFF\uA000-\uA48F\uA490-\uA4CF\uA4D0-\uA4FF\uA500-\uA63F\uA640-\uA69F\uA6A0-\uA6FF\uA700-\uA71F\uA720-\uA7FF\uA800-\uA82F\uA830-\uA83F\uA840-\uA87F\uA880-\uA8DF\uA8E0-\uA8FF\uA900-\uA92F\uA930-\uA95F\uA960-\uA97F\uA980-\uA9DF\uA9E0-\uA9FF\uAA00-\uAA5F\uAA60-\uAA7F\uAA80-\uAADF\uAAE0-\uAAFF\uAB00-\uAB2F\uAB30-\uAB6F\uAB70-\uABBF\uABC0-\uABFF\uAC00-\uD7AF\uD7B0-\uD7FF\uD800-\uDB7F\uDB80-\uDBFF\uDC00-\uDFFF\uE000-\uF8FF\uF900-\uFAFF\uFB00-\uFB4F\uFB50-\uFDFF\uFE00-\uFE0F\uFE10-\uFE1F\uFE20-\uFE2F\uFE30-\uFE4F\uFE50-\uFE6F\uFE70-\uFEFF\uFF00-\uFFEF\uFFF0-\uFFFF]+/)) {
      return text; // Already properly encoded
    }
    
    // Try to decode if it appears to be double-encoded
    const decoded = decodeURIComponent(escape(text));
    return decoded;
  } catch (error) {
    console.warn('UTF-8 decode warning:', error.message);
    return text; // Return original if decoding fails
  }
};

// Helper function to clean object with UTF-8 decoding
const cleanUTF8Object = (obj) => {
  if (typeof obj === 'string') {
    return decodeUTF8(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(cleanUTF8Object);
  } else if (obj && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = decodeUTF8(key);
      cleaned[cleanKey] = cleanUTF8Object(value);
    }
    return cleaned;
  }
  return obj;
};




export const submitForm = async (req, res) => {
  try {
    console.log("Session in submitForm:", req.session);
    console.log("Raw Request Body:", req.body);

    if (!req.user) {
      return res.status(401).json({ message: "Access denied, no authenticated user", session: req.session });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let formData = req.body || {};
    const cleanedBody = cleanUTF8Object(formData);
    console.log("Cleaned Request Body:", cleanedBody);

    let { name, mobile, branch, formId, language, submitted_at, agreement, ...formResponses } = cleanedBody;

    // Fallback to session user data
    name = name || user.name;
    mobile = mobile || user.mobile;
    branch = branch || user.branch;

    const { name: cleanedName, mobile: cleanedMobile, branch: cleanedBranch, formId: cleanedFormId, language: cleanedLanguage } = cleanedBody;

    if (!cleanedName || !cleanedMobile || !cleanedBranch) {
      return res.status(400).json({ message: "अधिकृत वापरकर्ता फील्ड्स गहाळ: नाव, मोबाईल आणि शाखा आवश्यक आहे." });
    }
    if (!cleanedFormId || !cleanedLanguage) {
      return res.status(400).json({ message: "अधिकृत फील्ड्स गहाळ: formId आणि language आवश्यक आहे." });
    }

    const validFormResponses = Object.fromEntries(
      Object.entries(formResponses).filter(([key]) => !['name', 'mobile', 'branch', 'formId', 'language', 'submitted_at', 'agreement'].includes(key))
    );

    if (Object.keys(validFormResponses).length === 0) {
      return res.status(400).json({ message: "कोणत्याही फॉर्म प्रतिसाद उपलब्ध नाहीत." });
    }

    if (!["en", "mr"].includes(cleanedLanguage)) {
      return res.status(400).json({ message: "अवैध भाषा. en किंवा mr असणे आवश्यक आहे." });
    }

const responses = Object.entries(validFormResponses).map(([questionText, answer]) => ({
  questionId: decodeUTF8(questionText).replace(/\s+/g, "_"),
  questionText: decodeUTF8(questionText),
  answer: decodeUTF8(answer),
  images: [],
  videos: [],
}));
    // Use Date.now() directly or parse submitted_at if provided and valid
    let submittedAtDate = Date.now();
    if (submitted_at) {
      const parsedDate = new Date(submitted_at);
      if (!isNaN(parsedDate.getTime())) {
        submittedAtDate = parsedDate;
      } else {
        console.warn("Invalid submitted_at value, using current date instead:", submitted_at);
      }
    }

    const newResponse = new Response({
      userId: user._id,
      formId: cleanedFormId,
      language: cleanedLanguage,
      responses,
      submittedAt: submittedAtDate, // Use parsed or default date
    });

    await newResponse.save();
    console.log("Response saved successfully:", newResponse._id);

    res.status(201).json({
      message: "फॉर्म यशस्वीरीत्या सबमिट झाला",
      data: newResponse,
    });
  } catch (error) {
    console.error("Form submission error:", error.message, error.stack);
    res.status(500).json({
      message: "फॉर्म सबमिट करताना त्रुटी",
      error: error.message,
      stack: error.stack,
    });
  }
};









export const getResponses = async (req, res) => {
  try {
    const { formId, language, mobile } = req.query;
    const query = {};
    
    if (formId) query.formId = formId;
    if (language) {
      if (!['en', 'mr'].includes(language)) {
        return res.status(400).json({
          message: 'Invalid language. Must be one of: en, mr.',
        });
      }
      query.language = language;
    }

    if (mobile) {
      const user = await User.findOne({ mobile });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      query.userId = user._id;
    }

    const responses = await Response.find(query)
      .populate('userId')
      .sort({ submittedAt: -1 });

    // Clean UTF-8 in responses before sending
    const cleanedResponses = responses.map(response => ({
      ...response.toObject(),
      responses: response.responses.map(resp => ({
        ...resp,
        questionText: decodeUTF8(resp.questionText),
        answer: decodeUTF8(resp.answer)
      }))
    }));

    res.status(200).json(cleanedResponses);
  } catch (error) {
    console.error('Error fetching responses:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching responses', error: error.message });
  }
};

export const deleteResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await Response.findById(id);
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Delete associated media files from cloudinary
    for (const resp of response.responses) {
      if (resp.images && resp.images.length > 0) {
        for (const imageUrl of resp.images) {
          try {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`YNK_Survey_Uploads/${publicId}`);
          } catch (deleteError) {
            console.error('Error deleting image:', deleteError);
          }
        }
      }
      if (resp.videos && resp.videos.length > 0) {
        for (const videoUrl of resp.videos) {
          try {
            const publicId = videoUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`YNK_Survey_Uploads/${publicId}`, {
              resource_type: 'video',
            });
          } catch (deleteError) {
            console.error('Error deleting video:', deleteError);
          }
        }
      }
    }

    await Response.deleteOne({ _id: id });
    res.status(200).json({ message: 'Response deleted successfully' });
  } catch (error) {
    console.error('Error deleting response:', error.message, error.stack);
    res.status(500).json({ message: 'Error deleting response', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete all responses and associated media for this user
    const responses = await Response.find({ userId: id });
    for (const response of responses) {
      for (const resp of response.responses) {
        if (resp.images && resp.images.length > 0) {
          for (const imageUrl of resp.images) {
            try {
              const publicId = imageUrl.split('/').pop().split('.')[0];
              await cloudinary.uploader.destroy(`YNK_Survey_Uploads/${publicId}`);
            } catch (deleteError) {
              console.error('Error deleting image:', deleteError);
            }
          }
        }
        if (resp.videos && resp.videos.length > 0) {
          for (const videoUrl of resp.videos) {
            try {
              const publicId = videoUrl.split('/').pop().split('.')[0];
              await cloudinary.uploader.destroy(`YNK_Survey_Uploads/${publicId}`, {
                resource_type: 'video',
              });
            } catch (deleteError) {
              console.error('Error deleting video:', deleteError);
            }
          }
        }
      }
    }

    await Response.deleteMany({ userId: id });
    await User.deleteOne({ _id: id });
    res.status(200).json({ message: 'User and associated responses deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error.message, error.stack);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const updateResponse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Clean the request body for UTF-8 issues
    const cleanedBody = cleanUTF8Object(req.body);
    const { responses, language } = cleanedBody;

    const response = await Response.findById(id);
    if (!response) {
      return res.status(404).json({ message: 'प्रतिसाद सापडला नाही' });
    }

    if (language) {
      const validLanguages = ['en', 'mr'];
      if (!validLanguages.includes(language)) {
        return res.status(400).json({
          message: 'अवैध भाषा. en किंवा mr असणे आवश्यक आहे.',
        });
      }
      response.language = language;
    }

    if (responses && Array.isArray(responses)) {
      response.responses = responses.map((resp) => ({
        questionId: resp.questionId || decodeUTF8(resp.questionText).replace(/\s+/g, "_"),
        questionText: decodeUTF8(resp.questionText),
        answer: decodeUTF8(resp.answer),
        images: resp.images || [],
        videos: resp.videos || [],
      }));
    }

    await response.save();
    res.status(200).json({ 
      message: 'प्रतिसाद यशस्वीरीत्या अपडेट झाला', 
      data: response 
    });
  } catch (error) {
    console.error('प्रतिसाद अपडेट करताना त्रुटी:', error.message, error.stack);
    res.status(500).json({ 
      message: 'प्रतिसाद अपडेट करताना त्रुटी', 
      error: error.message 
    });
  }
};