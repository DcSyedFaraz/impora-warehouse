import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

export default function ImporaUploadScreen() {
  const [numberValue, setNumberValue] = useState("");
  const [qrValue, setQrValue] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalHeading, setModalHeading] = useState("");


  // Function to take a photo using the device camera
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setModalHeading("Permission Error");
      setModalMessage("Permission to access gallery was denied.");
      setModalVisible(true);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  // This function handles picking an image from the gallery
  const pickImage = async () => {
    // Ask for permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setModalHeading("Permission Error");
      setModalMessage("Permission to access camera was denied.");
      setModalVisible(true);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      console.log("image ", result.assets);

      setImageUri(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (!numberValue || !qrValue) {
      setModalHeading("Missing Information");
      setModalMessage("Please fill in all required fields.");
      setModalVisible(true);
      return;
    }

    setIsLoading(true);

    try {
      let uploadedImageLink = null;

      if (imageUri) {
        const formData = new FormData();
        const imageInfo = {
          uri: imageUri,
          name: "photo.jpg",
          type: "image/jpeg",
        };
        formData.append("image", imageInfo as any);

        const endpoint =
          "https://impora-hausnotruf.de/wp-json/app-api/v1/upload-image";
        const username = "ck_470e9a3328471b032538dc5a5240d0da9bbf828d";
        const password = "cs_73664c5f2947028e89a3cf7e0e44dc90c981f5b9";
        const auth = "Basic " + btoa(`${username}:${password}`);

        const uploadResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: auth,
          },
          body: formData,
        });

        console.log("response", uploadResponse);
        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        uploadedImageLink = uploadResult.url;
      }

      const webhookResponse = await fetch(
        "https://hook.eu1.make.com/iwhcukw7w37ttjaa8c02oikgyo3wsh16",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: numberValue,
            qrCode: qrValue,
            imageLink: uploadedImageLink,
          }),
        }
      );
      // console.log("webhookResponse", webhookResponse);

      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed: ${webhookResponse.status}`);
      }

      setModalHeading("Daten übermittelt");
      setModalMessage("Die Daten wurden erfolgreich übermittelt.");
      setModalVisible(true);

      setNumberValue("");
      setQrValue("");
      setImageUri(null);
    } catch (error) {
      setModalHeading("Error");
      setModalMessage(
        `An error occurred: ${error instanceof Error ? error.message : String(error)}`
      );
      setModalVisible(true);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Header with Logo */}
          <View style={styles.header}>
            <Image
              source={{
                uri: "https://impora-hausnotruf.de/wp-content/uploads/2025/02/impora-hausnotruf-logo.webp",
              }}
              style={styles.logo}
            />
            {/* <Text style={styles.headerTitle}>Data Upload</Text> */}
          </View>

          {/* Main Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Account ID</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="keypad-outline"
                  size={20}
                  color="#3E7BFA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Scan or enter a number"
                  value={numberValue}
                  onChangeText={setNumberValue}
                  placeholderTextColor="#A0A0A0"
                  keyboardType="number-pad"
                  maxLength={8}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>QR Code</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="qr-code-outline"
                  size={20}
                  color="#3E7BFA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Scan or enter a QR Code"
                  value={qrValue}
                  onChangeText={setQrValue}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>

            {/* Image Section */}
            <View style={styles.imageSection}>
              <Text style={styles.inputLabel}>Image Upload</Text>
              {imageUri ? (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickImage}
                  >
                    <Ionicons name="image-outline" size={28} color="#3E7BFA" />
                    <Text style={styles.uploadButtonText}>From Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera-outline" size={28} color="#3E7BFA" />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!numberValue || !qrValue) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isLoading || !numberValue || !qrValue}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                    style={styles.sendIcon}
                  />
                  <Text style={styles.sendButtonText}>Send Data</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalHeading}</Text>
            <Text style={styles.modalText}>{modalMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    // flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    paddingVertical: 10,
  },
  logo: {
    width: 150,
    height: 50,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 10,
    color: "#333333",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 15,
    fontSize: 16,
    color: "#333333",
  },
  imageSection: {
    marginBottom: 25,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#3E7BFA",
    borderRadius: 8,
    backgroundColor: "#F0F7FF",
    padding: 5,
  },
  uploadButtonText: {
    fontSize: 16,
    color: "#3E7BFA",
    fontWeight: "600",
    marginLeft: 8,
  },
  imageContainer: {
    position: "relative",
    alignItems: "center",
    marginTop: 5,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  removeImageButton: {
    position: "absolute",
    top: 20,
    right: 10,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 2,
  },
  sendButton: {
    flexDirection: "row",
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "center",
    color: "#555",
  },
  modalButton: {
    backgroundColor: "#3E7BFA",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: "#3E7BFA",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
