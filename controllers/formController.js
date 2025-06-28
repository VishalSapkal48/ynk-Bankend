import Response from '../models/Response.js';
import User from '../models/User.js';
import cloudinary from '../config/cloudinary.js';

// Helper function to properly decode UTF-8 text
const decodeUTF8 = (text) => {
  if (typeof text !== 'string') return text;

  try {
    if (text.match(/^[\u0900-\u097F]+/)) {
      return text; // Assume it's already properly encoded Marathi
    }
    const decoded = decodeURIComponent(escape(text));
    return decoded;
  } catch (error) {
    console.warn('UTF-8 decode warning:', error.message, 'Original text:', text);
    return text;
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
    console.log("Files received:", req.files ? req.files.map(f => ({ name: f.originalname, mimetype: f.mimetype })) : "No files");

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

    const responses = [];
    const processedQuestions = new Set();

    for (let [questionText, answer] of Object.entries(validFormResponses)) {
      const decodedQuestionText = decodeUTF8(questionText);
      const questionId = decodedQuestionText.replace(/\s+/g, "_");
      let images = [];
      let videos = [];
      let isSubQuestion = false;
      let parentQuestionId = null;

      console.log(`Processing question: ${decodedQuestionText}, Answer: ${answer}`);

      if (decodedQuestionText.includes(" - ")) {
        const [parentQuestionText, subQuestionText] = decodedQuestionText.split(" - ", 2).map(decodeUTF8);
        parentQuestionId = parentQuestionText.replace(/\s+/g, "_");
        const subQuestionId = `${parentQuestionId}_${decodeUTF8(subQuestionText).replace(/\s+/g, "_")}`;
        isSubQuestion = true;

        console.log(`Detected subquestion - Parent: ${parentQuestionText}, Sub: ${subQuestionText}`);

        if (!processedQuestions.has(parentQuestionId)) {
          const parentMediaKey = `media[${parentQuestionText}]`;
          if (req.files && Array.isArray(req.files) && req.files.some(f => f.fieldname === parentMediaKey)) {
            const files = req.files.filter(f => f.fieldname === parentMediaKey);
            console.log(`Found ${files.length} files for ${parentMediaKey}:`, files.map(f => f.originalname));
            for (let file of files) {
              try {
                const result = await cloudinary.uploader.upload(file.buffer, {
                  resource_type: file.mimetype.startsWith("video") ? "video" : "image",
                  folder: `shop_setup_checklist/${user._id}`,
                  upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || "default_preset",
                });
                console.log(`Cloudinary upload success for ${file.originalname}:`, result.secure_url);
                if (file.mimetype.startsWith("image")) images.push(result.secure_url);
                else if (file.mimetype.startsWith("video")) videos.push(result.secure_url);
              } catch (uploadError) {
                console.error(`Cloudinary upload failed for ${file.originalname}:`, uploadError.message);
                continue;
              }
            }
          } else {
            console.log(`No files found for ${parentMediaKey}`);
          }
          responses.push({
            questionId: parentQuestionId,
            questionText: parentQuestionText,
            answer: validFormResponses[parentQuestionText] || (cleanedLanguage === "mr" ? "उत्तर दिले नाही" : "Not answered"),
            images,
            videos,
            isSubQuestion: false,
            parentQuestionId: null,
          });
          processedQuestions.add(parentQuestionId);
        }

        const subMediaKey = `media[${questionText}]`;
        if (req.files && Array.isArray(req.files) && req.files.some(f => f.fieldname === subMediaKey)) {
          const files = req.files.filter(f => f.fieldname === subMediaKey);
          console.log(`Found ${files.length} files for ${subMediaKey}:`, files.map(f => f.originalname));
          for (let file of files) {
            try {
              const result = await cloudinary.uploader.upload(file.buffer, {
                resource_type: file.mimetype.startsWith("video") ? "video" : "image",
                folder: `shop_setup_checklist/${user._id}`,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || "default_preset",
              });
              console.log(`Cloudinary upload success for ${file.originalname}:`, result.secure_url);
              if (file.mimetype.startsWith("image")) images.push(result.secure_url);
              else if (file.mimetype.startsWith("video")) videos.push(result.secure_url);
            } catch (uploadError) {
              console.error(`Cloudinary upload failed for ${file.originalname}:`, uploadError.message);
              continue;
            }
          }
        } else {
          console.log(`No files found for ${subMediaKey}`);
        }

        responses.push({
          questionId: subQuestionId,
          questionText: subQuestionText,
          answer: decodeUTF8(answer),
          images,
          videos,
          isSubQuestion: true,
          parentQuestionId,
        });
      } else {
        const mediaKey = `media[${questionText}]`;
        if (req.files && Array.isArray(req.files) && req.files.some(f => f.fieldname === mediaKey)) {
          const files = req.files.filter(f => f.fieldname === mediaKey);
          console.log(`Found ${files.length} files for ${mediaKey}:`, files.map(f => f.originalname));
          for (let file of files) {
            try {
              const result = await cloudinary.uploader.upload(file.buffer, {
                resource_type: file.mimetype.startsWith("video") ? "video" : "image",
                folder: `shop_setup_checklist/${user._id}`,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || "default_preset",
              });
              console.log(`Cloudinary upload success for ${file.originalname}:`, result.secure_url);
              if (file.mimetype.startsWith("image")) images.push(result.secure_url);
              else if (file.mimetype.startsWith("video")) videos.push(result.secure_url);
            } catch (uploadError) {
              console.error(`Cloudinary upload failed for ${file.originalname}:`, uploadError.message);
              continue;
            }
          }
        } else {
          console.log(`No files found for ${mediaKey}`);
        }

        responses.push({
          questionId,
          questionText: decodedQuestionText,
          answer: decodeUTF8(answer),
          images,
          videos,
          isSubQuestion: false,
          parentQuestionId: null,
        });
        processedQuestions.add(questionId);
      }
    }

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
      submittedAt: submittedAtDate,
    });

    await newResponse.save();
    console.log("Response saved successfully:", newResponse._id, "Responses:", JSON.stringify(responses, null, 2));

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
        return res.status(400).json({ message: 'Invalid language. Must be one of: en, mr.' });
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

    console.log('Raw Database Responses:', JSON.stringify(responses, null, 2));

    const cleanedResponses = responses.map((response) => {
      const cleaned = {
        ...response.toObject(),
        responses: response.responses.map((resp) => ({
          ...resp,
          questionText: decodeUTF8(resp.questionText),
          answer: decodeUTF8(resp.answer),
        })),
      };
      console.log('Cleaned Response:', JSON.stringify(cleaned, null, 2));
      return cleaned;
    });

    console.log('Fetched Responses (Final):', JSON.stringify(cleanedResponses, null, 2));
    res.status(200).json(cleanedResponses);
  } catch (error) {
    console.error('Error fetching responses:', error.message, error.stack);
    res.status(500).json({ 
      message: language === 'mr' ? 'प्रतिसाद आणताना त्रुटी' : 'Error fetching responses', 
      error: error.message 
    });
  }
};

export const deleteResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await Response.findById(id);
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    for (const resp of response.responses) {
      if (resp.images?.length > 0) {
        for (const imageUrl of resp.images) {
          try {
            const publicId = imageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`shop_setup_checklist/${response.userId}/${publicId}`);
          } catch (deleteError) {
            console.error('Error deleting image:', deleteError);
          }
        }
      }
      if (resp.videos?.length > 0) {
        for (const videoUrl of resp.videos) {
          try {
            const publicId = videoUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`shop_setup_checklist/${response.userId}/${publicId}`, { resource_type: 'video' });
          } catch (deleteError) {
            console.error('Error deleting video:', deleteError);
          }
        }
      }
    }

    await Response.deleteOne({ _id: id });
    console.log('Response deleted:', id);
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

    const responses = await Response.find({ userId: id });
    for (const response of responses) {
      for (const resp of response.responses) {
        if (resp.images?.length > 0) {
          for (const imageUrl of resp.images) {
            try {
              const publicId = imageUrl.split('/').pop().split('.')[0];
              await cloudinary.uploader.destroy(`shop_setup_checklist/${user._id}/${publicId}`);
            } catch (deleteError) {
              console.error('Error deleting image:', deleteError);
            }
          }
        }
        if (resp.videos?.length > 0) {
          for (const videoUrl of resp.videos) {
            try {
              const publicId = videoUrl.split('/').pop().split('.')[0];
              await cloudinary.uploader.destroy(`shop_setup_checklist/${user._id}/${publicId}`, { resource_type: 'video' });
            } catch (deleteError) {
              console.error('Error deleting video:', deleteError);
            }
          }
        }
      }
    }

    await Response.deleteMany({ userId: id });
    await User.deleteOne({ _id: id });
    console.log('User deleted:', id);
    res.status(200).json({ message: 'User and associated responses deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error.message, error.stack);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

export const updateResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanedBody = cleanUTF8Object(req.body);
    const { responses, language } = cleanedBody;

    console.log('Update Request Body:', cleanedBody);

    const response = await Response.findById(id);
    if (!response) {
      return res.status(404).json({ message: 'Response not found' });
    }

    if (language) {
      if (!['en', 'mr'].includes(language)) {
        return res.status(400).json({ message: 'Invalid language. Must be one of: en, mr.' });
      }
      response.language = language;
    }

    if (responses && Array.isArray(responses)) {
      response.responses = responses.map((resp) => ({
        questionId: resp.questionId || decodeUTF8(resp.questionText).replace(/\s+/g, '_'),
        questionText: decodeUTF8(resp.questionText),
        answer: decodeUTF8(resp.answer),
        images: resp.images || [],
        videos: resp.videos || [],
      }));
    }

    await response.save();
    console.log('Response updated:', response._id);
    res.status(200).json({
      message: 'Response updated successfully',
      data: response,
    });
  } catch (error) {
    console.error('Error updating response:', error.message, error.stack);
    res.status(500).json({
      message: 'Error updating response',
      error: error.message,
    });
  }
};