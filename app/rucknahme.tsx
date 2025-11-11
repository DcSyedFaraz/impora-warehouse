import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// Types
interface ModalState {
  visible: boolean;
  heading: string;
  message: string;
}

// Constants
const LOGO_URL =
  "https://impora-hausnotruf.de/wp-content/uploads/2025/02/impora-hausnotruf-logo.webp";

const API_CONFIG = {
  imageUploadEndpoint:
    "https://impora-hausnotruf.de/wp-json/wc/v3/app-api/upload-image",
  credentials: {
    username: "ck_470e9a3328471b032538dc5a5240d0da9bbf828d",
    password: "cs_73664c5f2947028e89a3cf7e0e44dc90c981f5b9",
  },
};

export default function RucknahmeScreen() {
  const router = useRouter();

  // State
  const [rucknahmeQrCode, setRucknahmeQrCode] = useState("");
  const [rucknahmeBearbeiter, setRucknahmeBearbeiter] = useState("");
  const [rucknahmeNotizen, setRucknahmeNotizen] = useState("");
  const [rucknahmeLoading, setRucknahmeLoading] = useState(false);
  const [rucknahmeImages, setRucknahmeImages] = useState<(string | null)[]>([
    null,
    null,
    null,
  ]);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    heading: "",
    message: "",
  });

  // Label erzeugen state
  const [labelErzeugenModalVisible, setLabelErzeugenModalVisible] = useState(false);
  const [labelErzeugenQrCode, setLabelErzeugenQrCode] = useState("");
  const [labelErzeugenLoading, setLabelErzeugenLoading] = useState(false);

  // Utility functions
  const showModal = (heading: string, message: string) => {
    setModal({ visible: true, heading, message });
  };

  const hideModal = () => {
    setModal({ ...modal, visible: false });
  };

  // Image handling
  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showModal("Permission Error", "Permission to access camera was denied.");
      return false;
    }
    return true;
  };

  const pickRucknahmeImage = async (index: number) => {
    if (!(await requestImagePermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      setRucknahmeImages((prev) => {
        const newImages = [...prev];
        newImages[index] = result.assets[0].uri;
        return newImages;
      });
    }
  };

  const removeRucknahmeImage = (index: number) => {
    setRucknahmeImages((prev) => {
      const newImages = [...prev];
      newImages[index] = null;
      return newImages;
    });
  };

  // Upload Rücknahme images
  const uploadRucknahmeImages = async (): Promise<string[]> => {
    const imagesToUpload = rucknahmeImages.filter((img) => img !== null);
    if (imagesToUpload.length === 0) {
      return [];
    }

    const formData = new FormData();

    imagesToUpload.forEach((imageUri, idx) => {
      const imageInfo = {
        uri: imageUri,
        name: `rucknahme_image${idx + 1}.jpg`,
        type: "image/jpeg",
      };
      formData.append("image[]", imageInfo as any);
    });

    console.log("Uploading Rücknahme images:", imagesToUpload.length);

    const auth =
      "Basic " +
      btoa(
        `${API_CONFIG.credentials.username}:${API_CONFIG.credentials.password}`
      );

    const response = await fetch(API_CONFIG.imageUploadEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: auth,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Image upload failed: ${response.status}`);
    }

    const result = await response.json();
    console.log("Rücknahme image upload response:", result);

    if (!result.success || !result.urls) {
      throw new Error("Image upload failed - invalid response format");
    }

    return result.urls;
  };

  // Rücknahme submit handler
  const handleRucknahmeSubmit = async () => {
    if (!rucknahmeQrCode.trim() || !rucknahmeBearbeiter.trim()) {
      showModal("Fehlende Informationen", "Bitte füllen Sie alle Felder aus.");
      return;
    }

    setRucknahmeLoading(true);

    try {
      // Upload images first if any exist
      const uploadedImageUrls = await uploadRucknahmeImages();

      const payload: any = {
        qrCode: rucknahmeQrCode,
        bearbeiter: rucknahmeBearbeiter,
        notizen: rucknahmeNotizen,
      };

      // Add image URLs to payload if any were uploaded
      if (uploadedImageUrls.length > 0) {
        payload.images = uploadedImageUrls;
      }

      const response = await fetch(
        "https://hook.eu1.make.com/adlse6tyzwpvs1cv356xmxyfm7hvbicq",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      console.log("responseText", responseText);
      console.log("response.status", response.status);

      // Handle 400 error - keep screen open with data, preserve all fields and images
      if (response.status === 400) {
        showModal("Fehler", responseText);
        setRucknahmeLoading(false); // Stop loading state
        return; // Don't close screen or reset form - keep all data
      }

      // Only proceed with success handling for 200 status
      if (response.status === 200) {
        // Show success modal
        showModal("Erfolgreich", responseText);

        // Reset Rücknahme form only on success
        setRucknahmeQrCode("");
        setRucknahmeBearbeiter("");
        setRucknahmeNotizen("");
        setRucknahmeImages([null, null, null]);

        // Navigate back to home after showing success
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        // For other error statuses, show error but keep form data
        showModal("Fehler", responseText);
        setRucknahmeLoading(false);
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error);
      console.error("Error during Rücknahme submission:", errorStr);
      showModal("Error", "Daten konnten nicht übermittelt werden!");
    } finally {
      setRucknahmeLoading(false);
    }
  };

  // Label erzeugen submit handler
  const handleLabelErzeugenSubmit = async () => {
    if (!labelErzeugenQrCode.trim()) {
      showModal("Fehlende Informationen", "Bitte geben Sie einen QR Code ein.");
      return;
    }

    setLabelErzeugenLoading(true);

    try {
      const payload = {
        qrCode: labelErzeugenQrCode,
        label_erzeugen: true,
      };

      const response = await fetch(
        "https://hook.eu1.make.com/adlse6tyzwpvs1cv356xmxyfm7hvbicq",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();
      console.log("Label erzeugen responseText", responseText);
      console.log("Label erzeugen response.status", response.status);

      // Handle 400 error - keep modal open with data
      if (response.status === 400) {
        showModal("Fehler", responseText);
        setLabelErzeugenLoading(false); // Stop loading state
        return; // Don't close modal or reset form - keep all data
      }

      // Handle 200 success - close modal and show success
      if (response.status === 200) {
        // Close Label erzeugen modal first
        setLabelErzeugenModalVisible(false);

        // Show response modal after a brief delay to ensure modal closes
        setTimeout(() => {
          showModal("Erfolgreich", responseText);
        }, 300);

        // Reset form only on success
        setLabelErzeugenQrCode("");
      } else {
        // For other error statuses, show error but keep form data
        showModal("Fehler", responseText);
        setLabelErzeugenLoading(false);
      }
    } catch (error) {
      const errorStr = error instanceof Error ? error.message : String(error);
      console.error("Error during Label erzeugen submission:", errorStr);
      showModal("Error", "Daten konnten nicht übermittelt werden!");
    } finally {
      setLabelErzeugenLoading(false);
    }
  };

  // Render Modal
  const renderModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modal.visible}
      onRequestClose={hideModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Ionicons
            name={
              modal.heading === "Erfolgreich"
                ? "checkmark-circle"
                : "close-circle"
            }
            size={50}
            color={modal.heading === "Erfolgreich" ? "green" : "red"}
          />
          <Text style={styles.modalTitle}>{modal.heading}</Text>
          <Text style={styles.modalText}>{modal.message}</Text>
          <TouchableOpacity style={styles.modalButton} onPress={hideModal}>
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Render Label erzeugen modal
  const renderLabelErzeugenModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={labelErzeugenModalVisible}
      onRequestClose={() => setLabelErzeugenModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.labelErzeugenModalContent}>
          <Text style={styles.modalTitle}>Label erzeugen</Text>

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
                placeholder="QR Code eingeben"
                value={labelErzeugenQrCode}
                onChangeText={setLabelErzeugenQrCode}
                placeholderTextColor="#A0A0A0"
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setLabelErzeugenModalVisible(false)}
              disabled={labelErzeugenLoading}
            >
              <Text style={styles.cancelButtonText}>Abbrechen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                labelErzeugenLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleLabelErzeugenSubmit}
              disabled={labelErzeugenLoading}
            >
              {labelErzeugenLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                    style={styles.sendIcon}
                  />
                  <Text style={styles.submitButtonText}>Senden</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} />
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => router.back()}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
              <Text style={styles.menuButtonText}>Menü</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.titleHeader}>
              <Text style={styles.screenTitle}>Rücknahme</Text>
              <TouchableOpacity
                style={styles.labelErzeugenIconButton}
                onPress={() => setLabelErzeugenModalVisible(true)}
              >
                <Text style={styles.labelErzeugenButtonText}>
                  Label erzeugen
                </Text>
              </TouchableOpacity>
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
                  placeholder="QR Code eingeben"
                  value={rucknahmeQrCode}
                  onChangeText={setRucknahmeQrCode}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Bearbeiter</Text>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#3E7BFA"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Bearbeiter eingeben"
                  value={rucknahmeBearbeiter}
                  onChangeText={setRucknahmeBearbeiter}
                  placeholderTextColor="#A0A0A0"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notizen</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#3E7BFA"
                  style={[styles.inputIcon, styles.textAreaIcon]}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notizen eingeben (optional)"
                  value={rucknahmeNotizen}
                  onChangeText={setRucknahmeNotizen}
                  placeholderTextColor="#A0A0A0"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Image upload section */}
            <View style={styles.imagesSection}>
              <Text style={styles.inputLabel}>Bilder (Optional)</Text>
              <View style={styles.imagesGrid}>
                {rucknahmeImages.map((imageUri, index) => (
                  <View key={index} style={styles.imageSlot}>
                    {imageUri ? (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: imageUri }}
                          style={styles.previewImage}
                        />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => removeRucknahmeImage(index)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#FF3B30"
                          />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => pickRucknahmeImage(index)}
                      >
                        <Ionicons
                          name="camera-outline"
                          size={32}
                          color="#3E7BFA"
                        />
                        <Text style={styles.uploadText}>Bild {index + 1}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                rucknahmeLoading && styles.submitButtonDisabled,
              ]}
              onPress={handleRucknahmeSubmit}
              disabled={rucknahmeLoading}
            >
              {rucknahmeLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                    style={styles.sendIcon}
                  />
                  <Text style={styles.submitButtonText}>Senden</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      {renderModal()}
      {renderLabelErzeugenModal()}
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
  titleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  labelErzeugenIconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F0F9F4",
  },
  labelErzeugenButtonText: {
    color: "#34C759",
    fontSize: 14,
    fontWeight: "600",
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
  textAreaWrapper: {
    minHeight: 100,
    alignItems: "flex-start",
  },
  textAreaIcon: {
    paddingTop: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  imagesSection: {
    marginBottom: 20,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  imageSlot: {
    width: "30%",
    aspectRatio: 1,
  },
  uploadButton: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#3E7BFA",
    borderRadius: 8,
    backgroundColor: "#F0F7FF",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  uploadText: {
    fontSize: 12,
    color: "#3E7BFA",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  imageContainer: {
    position: "relative",
    flex: 1,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 2,
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#3E7BFA",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  sendIcon: {
    marginRight: 8,
  },
  submitButtonText: {
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
  labelErzeugenModalContent: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
});
