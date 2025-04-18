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

const APP_VERSION = "2.0.0"; // Add version number here

export default function ImporaUploadScreen() {
  const [selectedForm, setSelectedForm] = useState<
    "accountQR" | "verpackung" | null
  >(null);
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
      setImageUri(result.assets[0].uri);
    }
  };

  const handleFormChange = (newForm: "accountQR" | "verpackung" | null) => {
    // Clear all input values when changing forms
    setNumberValue("");
    setQrValue("");
    setImageUri(null);
    setSelectedForm(newForm);
  };

  const handleSend = async () => {
    if (selectedForm === "accountQR") {
      if (!numberValue || !qrValue) {
        setModalHeading("Missing Information");
        setModalMessage("Please fill in all required fields.");
        setModalVisible(true);
        return;
      }
    } else if (selectedForm === "verpackung") {
      if (!imageUri) {
        setModalHeading("Missing Information");
        setModalMessage("Please upload an image.");
        setModalVisible(true);
        return;
      }
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

        console.log("FormData:", formData);

        const endpoint =
          "https://impora-hausnotruf.de/wp-json/wc/v3/app-api/upload-image";
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

        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed: ${uploadResponse.status}`);
        }

        const uploadResult = await uploadResponse.json();
        uploadedImageLink = uploadResult.url;
      }

      const payload =
        selectedForm === "accountQR"
          ? {
              number: numberValue,
              qrCode: qrValue,
              way: "account-id-with-qr-code",
            }
          : {
              imageLink: uploadedImageLink,
              way: "picutre-box",
            };
      if (
        selectedForm === "accountQR" ||
        (selectedForm === "verpackung" && uploadedImageLink)
      ) {
        const webhookResponse = await fetch(
          "https://hook.eu1.make.com/iwhcukw7w37ttjaa8c02oikgyo3wsh16",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!webhookResponse.ok) {
          throw new Error(`Webhook request failed: ${webhookResponse.status}`);
        }

        // let webhookResult;
        const webhookResult = await webhookResponse.text();
        // try {
        //   webhookResult = JSON.parse(responseText);
        // } catch (error) {
        //   console.log("Response text:", responseText);
        //   throw new Error("Invalid JSON response from webhook");
        // }

        console.log("webhookResult", webhookResult);

        if (webhookResult != "done") {
          setModalHeading("Error");
          setModalMessage(`Daten konnten nicht übermittelt werden!`);
          setModalVisible(true);
          return;
        }
      } else {
        setModalHeading("Error");
        setModalMessage("Webhook call aborted: One or more fields are empty.");
        setModalVisible(true);
        return;
      }

      setModalHeading("Daten übermittelt");
      setModalMessage("Die Daten wurden erfolgreich übermittelt.");
      setModalVisible(true);

      setNumberValue("");
      setQrValue("");
      setImageUri(null);
    } catch (error) {
      console.log("Error:", error);

      setModalHeading("Error");
      setModalMessage(`Daten konnten nicht übermittelt werden!`);
      setModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Render either selection screen or main form based on selectedForm state
  return (
    <>
      {!selectedForm ? (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.selectionContainer}>
            {/* Add logo to selection screen */}
            <Image
              source={{
                uri: "https://impora-hausnotruf.de/wp-content/uploads/2025/02/impora-hausnotruf-logo.webp",
              }}
              style={styles.selectionLogo}
            />

            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => handleFormChange("accountQR")}
            >
              <Text style={styles.selectionButtonText}>
                Account ID &amp; QR Code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.selectionButton}
              onPress={() => handleFormChange("verpackung")}
            >
              <Text style={styles.selectionButtonText}>
                Verpackungsbild verarbeiten
              </Text>
            </TouchableOpacity>

            {/* Add version number at bottom */}
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
              <View style={styles.header}>
                {/* Always show logo on main screen */}
                <Image
                  source={{
                    uri: "https://impora-hausnotruf.de/wp-content/uploads/2025/02/impora-hausnotruf-logo.webp",
                  }}
                  style={styles.logo}
                />

                {/* Repositioned Menu button */}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => handleFormChange(null)}
                >
                  <Ionicons name="menu" size={24} color="#FFFFFF" />
                  <Text style={styles.menuButtonText}>Menü</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                {selectedForm === "accountQR" && (
                  <>
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
                  </>
                )}

                {selectedForm === "verpackung" && (
                  <View style={styles.imageSection}>
                    {/* Changed to "Bild hochladen" */}
                    <Text style={styles.inputLabel}>Bild hochladen</Text>
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
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#FF3B30"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={styles.uploadButton}
                          onPress={takePhoto}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={28}
                            color="#3E7BFA"
                          />
                          <Text style={styles.uploadButtonText}>
                            Take Photo
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    ((selectedForm === "accountQR" &&
                      (!numberValue || !qrValue)) ||
                      (selectedForm === "verpackung" && !imageUri)) &&
                      styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={
                    isLoading ||
                    (selectedForm === "accountQR"
                      ? !numberValue || !qrValue
                      : !imageUri)
                  }
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
                      {/* Changed to "Daten senden" */}
                      <Text style={styles.sendButtonText}>Daten senden</Text>
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
                {modalHeading === "Daten übermittelt" ? (
                  <Ionicons name="checkmark-circle" size={50} color="green" />
                ) : (
                  <Ionicons name="close-circle" size={50} color="red" />
                )}
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
      )}
    </>
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
  selectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  selectionLogo: {
    width: 200,
    height: 70,
    resizeMode: "contain",
    marginBottom: 40,
  },
  selectionButton: {
    width: "80%",
    paddingVertical: 20,
    marginVertical: 10,
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    alignItems: "center",
  },
  selectionButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  versionText: {
    position: "absolute",
    bottom: 20,
    color: "#666",
    fontSize: 14,
  },
  // Replaced changeOptionButton with menuButton
  menuButton: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#3E7BFA",
    borderRadius: 6,
    zIndex: 10,
  },
  menuButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    paddingVertical: 10,
    position: "relative",
  },
  logo: {
    width: 180,
    height: 60,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 20,
    marginTop: 20,
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
    padding: 20,
  },
  uploadButtonText: {
    fontSize: 16,
    color: "#3E7BFA",
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonRow: {
    // alignItems: "center",
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
    shadowOffset: { width: 0, height: 4 },
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
    shadowOffset: { width: 0, height: 2 },
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
