from google.cloud import storage
import google.cloud.exceptions

class CloudStorage:  
      
    def __init__(self): 
        # Uses "GOOGLE_APPLICATION_CREDENTIALS" environment variable to get service account key
        self.client = storage.Client()
      
    def read_bytes(self, bucket, file):
        try:
            bucket = self.client.bucket(bucket)
            blob = bucket.blob(file)
            data = blob.download_as_bytes()
        except google.cloud.exceptions.NotFound:
            return None
            
        return data