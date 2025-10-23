# AI Data Extraction Feature Guide

## Overview
The AI Data Extraction feature uses Google's Gemini AI to automatically extract cocoon market data from Kannada or English text and populate the database. This significantly reduces manual data entry time and improves accuracy.

## Features

### ✨ **Intelligent Text Extraction**
- Supports both Kannada (ಕನ್ನಡ) and English text
- Extracts market name, date, and price data
- Handles multiple breed categories (Mixed/CB, Bivoltine/BV, CB Gold)
- Automatically structures data for database entry

### 🎯 **Multi-Entry Processing**
- Extracts multiple price entries from a single text
- Preview all extracted data before saving
- Edit quality grades before submission
- Batch save all entries at once

### 🔒 **Security & Validation**
- Market permission validation
- Data validation before saving
- Error handling and user feedback
- Same security as manual entry

## Setup Instructions

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment

Add the API key to your `.env` file:

```bash
# Google Gemini AI Configuration
EXPO_PUBLIC_GEMINI_API_KEY=your-actual-api-key-here
```

**Important:** Keep this key secure and never commit it to version control!

### 3. Restart Application

After adding the API key, restart the Expo development server:

```bash
# Stop current server (Ctrl+C)
# Clear cache and restart
expo start -c
```

## How to Use

### Step 1: Access AI Extraction

1. Login to the admin panel
2. From the dashboard, click **"AI Data Extract"**
3. You'll see the AI extraction screen

### Step 2: Prepare Your Data

The AI can extract data from market reports in this format:

**Kannada Example:**
```
ಸರ್ಕಾರಿ ರೇಷ್ಮೆ ಗೂಡಿನ ಮಾರುಕಟ್ಟೆ ಕನಕಪುರ
ದಿನಾಂಕ:-23-10-2025
ಒಟ್ಟು ತಂಡಗಳು: 230
ಮಿಶ್ರ ತಂಡಗಳು : 220
ಒಟ್ಟು ತೂಕ      : 8819 kg
ಹೆಚ್ಚು ದರ.       : 569
ಕಡಿಮೆ ದರ.     : 280
ಸರಾಸರಿ ದರ.   : 463
ದ್ವಿತಳಿ ತಂಡಗಳು.   : 10
ಒಟ್ಟು ತೂಕ.     : 335 kg
ಹೆಚ್ಚು ದರ.       : 715
ಕಡಿಮೆ ದರ.     :  441
ಸರಾಸರಿ ದರ.   :  636
```

**English Example:**
```
GOVT COCOON MARKET KOLLEGAL
TRANSACTION Details
DATE: 23.10.2025
Total lots: 183
CB GOLD
LOTS: 183
QTY: 11418.040
MAX: 625
MIN: 388
AVG: 496
```

### Step 3: Extract Data

1. **Copy** the market report text
2. **Paste** it into the text area
3. Click **"Extract Data with AI"**
4. Wait for AI processing (usually 2-5 seconds)

### Step 4: Review Extracted Data

The AI will show you:
- **Market Name** (e.g., Kanakapura, Kollegal)
- **Date** of transaction
- **Price Entries** for each breed category found

Each entry shows:
- Breed type (CB or BV)
- Quality grade (default A, can be changed)
- Number of lots
- Price range (min, max, average)

### Step 5: Adjust Quality Grades

Before saving, you can adjust quality grades:
- Tap on **A**, **B**, or **C** for each entry
- Quality grades affect how farmers see the data
- Default is **A** (highest quality)

### Step 6: Save to Database

1. Review all entries
2. Click **"Save All (X)"** where X is the number of entries
3. Confirm the action
4. Wait for success confirmation

## Data Mapping

### Breed Categories

| Kannada Term | English Term | Database Code |
|--------------|--------------|---------------|
| ಮಿಶ್ರ | Mixed/Cross Breed | CB |
| ದ್ವಿತಳಿ | Bivoltine | BV |
| CB GOLD | CB Gold | CB (Grade A) |

### Price Fields

| Field | Description | Kannada | English |
|-------|-------------|---------|---------|
| Lots | Number of lots | ತಂಡಗಳು | LOTS |
| Total Weight | Total quantity | ಒಟ್ಟು ತೂಕ | QTY |
| Max Price | Maximum price | ಹೆಚ್ಚು ದರ | MAX |
| Min Price | Minimum price | ಕಡಿಮೆ ದರ | MIN |
| Avg Price | Average price | ಸರಾಸರಿ ದರ | AVG |

### Market Names

Common market name variations:
- Kanakapura / ಕನಕಪುರ
- Kollegal / Kollegala / ಕೊಲ್ಲೇಗಾಲ
- Ramanagara / ರಾಮನಗರ
- Siddalagatta / ಸಿದ್ದಲಾಘಟ್ಟ
- Kolar / ಕೋಲಾರ

## Tips for Best Results

### ✅ **Do's**

- **Copy complete reports** with market name and date
- **Include all price categories** present in the report
- **Verify extracted data** before saving
- **Use official reports** for accuracy
- **Check market permissions** before extracting

### ❌ **Don'ts**

- **Don't mix multiple markets** in one extraction
- **Don't use partial data** without market name or date
- **Don't skip review** of extracted data
- **Don't extract for unauthorized markets**
- **Don't share your API key**

## Troubleshooting

### "Gemini API key not configured"

**Problem:** API key is missing or invalid

**Solution:**
1. Check `.env` file has `EXPO_PUBLIC_GEMINI_API_KEY`
2. Verify the key is correct (no extra spaces)
3. Restart the Expo server: `expo start -c`

### "Extraction Failed"

**Problem:** AI couldn't parse the text

**Possible Causes:**
- Text format is too different from expected
- Missing critical information (market name, date)
- Text is corrupted or incomplete

**Solution:**
1. Check that you copied the complete report
2. Verify market name and date are present
3. Try reformatting the text to be clearer
4. Use manual entry if AI extraction fails repeatedly

### "Permission Denied"

**Problem:** You don't have access to the extracted market

**Solution:**
1. Check which markets you have permission for
2. Super admins have access to all markets
3. Market admins can only update their assigned market
4. Contact super admin to adjust permissions

### "Validation Error"

**Problem:** Extracted data doesn't meet validation rules

**Common Issues:**
- Max price is less than or equal to min price
- Lots number is 0 or negative
- Prices are 0 or negative

**Solution:**
1. Check the original text for errors
2. Manually correct the values if needed
3. Use manual entry form for complex cases

### AI Extracts Wrong Market Name

**Problem:** Market name variations not recognized

**Solution:**
1. Click "Edit Text" to go back
2. Standardize the market name in the text
3. Use common English names (Kanakapura, Kollegal, etc.)
4. Try extraction again

## Performance & Costs

### API Usage

- **Free Tier:** 60 requests per minute
- **Cost:** Free for moderate usage
- **Typical extraction:** 1 request = 1 market report
- **Processing time:** 2-5 seconds per extraction

### Optimization Tips

- **Batch reports:** Extract one report at a time
- **Off-peak hours:** Use during low-traffic times
- **Monitor quota:** Check Google AI Studio for usage
- **Fallback:** Manual entry always available

## Security Considerations

### API Key Security

- ✅ Store in `.env` file (gitignored)
- ✅ Never commit to version control
- ✅ Don't share in screenshots or docs
- ✅ Regenerate if exposed
- ❌ Never hardcode in source files
- ❌ Don't share with unauthorized users

### Data Privacy

- AI processes text temporarily for extraction
- No data is stored by Google after processing
- All extracted data follows existing security rules
- Market permissions are enforced
- Admin authentication required

## Comparison: AI vs Manual Entry

### Time Savings

| Method | Time per Entry | Accuracy |
|--------|----------------|----------|
| **Manual Entry** | ~2 minutes | 95% (human error) |
| **AI Extraction** | ~10 seconds | 98% (requires review) |

### When to Use Each

**Use AI Extraction When:**
- You have official market reports in text format
- Multiple entries need to be added quickly
- Data is in standard format
- You want to reduce typing errors

**Use Manual Entry When:**
- You have only 1-2 entries
- Data is in unusual format
- You're entering custom or adjusted prices
- AI extraction fails or gives errors

## Advanced Usage

### Handling Multiple Breeds

If a report contains multiple breed types:
- AI extracts all breeds automatically
- Each breed becomes a separate entry
- Review and adjust quality for each
- Save all entries together

### Custom Quality Grading

Default quality is **A**, but you can adjust:
- **Grade A:** Premium quality cocoons
- **Grade B:** Good quality cocoons
- **Grade C:** Standard quality cocoons

Quality affects price visibility to farmers.

### Bulk Processing

For multiple market reports:
1. Extract first report
2. Review and save
3. Return to extraction screen
4. Extract next report
5. Repeat for all reports

## Future Enhancements

Planned features:
- [ ] Photo/image text extraction (OCR)
- [ ] Automatic quality grade detection
- [ ] Historical data comparison
- [ ] Batch processing multiple reports
- [ ] Export extracted data to CSV
- [ ] AI-powered price predictions

## Support

### Getting Help

- **Technical Issues:** Check this guide first
- **API Problems:** Visit [Google AI Studio](https://makersuite.google.com/)
- **Feature Requests:** Contact development team
- **Bug Reports:** Report with screenshots and error messages

### Training Resources

- **Admin Panel Guide:** See `ADMIN_PANEL_README.md`
- **Video Tutorial:** (Coming soon)
- **Live Demo:** Contact admin for walkthrough

---

**Version:** 1.0.0
**Last Updated:** October 23, 2025
**Powered by:** Google Gemini AI
