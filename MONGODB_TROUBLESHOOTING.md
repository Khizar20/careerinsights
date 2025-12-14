# MongoDB Atlas Connection Troubleshooting

## Your Connection String
```
# Replace with your MongoDB Atlas connection string
# Format: mongodb+srv://username:password@cluster.mongodb.net/
```

## Common SSL Handshake Errors & Solutions

### Issue: SSL/TLS Handshake Failed

This error usually occurs due to:

1. **IP Address Not Whitelisted** (Most Common)
   - Go to MongoDB Atlas → Network Access
   - Click "Add IP Address"
   - Add your current IP address
   - OR temporarily add `0.0.0.0/0` for testing (not recommended for production)

2. **Python SSL Library Issues**
   - Try updating certificates:
     ```bash
     pip install --upgrade certifi
     ```

3. **Network/Firewall Blocking**
   - Check if your firewall or network is blocking MongoDB connections
   - Port 27017 should be open for MongoDB

4. **Connection String Format**
   - Your connection string looks correct
   - Make sure there are no extra spaces or special characters

## Alternative: Use Local MongoDB

If MongoDB Atlas continues to have issues, you can use local MongoDB:

1. **Install MongoDB locally:**
   - Windows: Download from https://www.mongodb.com/try/download/community
   - Or use Docker: `docker run -d -p 27017:27017 mongo`

2. **Update .env:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/
   ```

## Current Status

✅ **Your application will work without MongoDB!**

The app uses **in-memory storage** as a fallback when MongoDB isn't available. This means:
- ✅ All features work
- ✅ Interview sessions are saved
- ✅ Progress is tracked
- ⚠️ Data is lost when server restarts

For production, you'll want to fix the MongoDB connection, but for development/testing, the in-memory storage is fine.

## Test Connection

To test if your MongoDB connection works:

```python
from pymongo import MongoClient
# Replace with your MongoDB Atlas connection string
uri = "mongodb+srv://username:password@cluster.mongodb.net/"
client = MongoClient(uri, serverSelectionTimeoutMS=10000)
client.admin.command('ping')
print("✅ Connected!")
```

## Next Steps

1. **Check MongoDB Atlas Network Access** - Whitelist your IP
2. **Verify credentials** - Make sure username/password are correct
3. **Check cluster status** - Ensure cluster is running in Atlas dashboard
4. **Use fallback** - App works fine with in-memory storage for now

