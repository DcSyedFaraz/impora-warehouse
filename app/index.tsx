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

// Types
type ProductType = "basisstation" | "james_uhr";
type FormType = "accountQR" | "verpackung" | "imeiQR";

interface ModalState {
  visible: boolean;
  heading: string;
  message: string;
}

// Constants
const APP_VERSION = "2.1.0";
const LOGO_URL =
  "https://impora-hausnotruf.de/wp-content/uploads/2025/02/impora-hausnotruf-logo.webp";

const API_CONFIG = {
  imageUploadEndpoint:
    "https://impora-hausnotruf.de/wp-json/wc/v3/app-api/upload-image",
  webhookEndpoint: "https://hook.eu1.make.com/iwhcukw7w37ttjaa8c02oikgyo3wsh16",
  credentials: {
    username: "ck_470e9a3328471b032538dc5a5240d0da9bbf828d",
    password: "cs_73664c5f2947028e89a3cf7e0e44dc90c981f5b9",
  },
};

export default function ImporaUploadScreen() {
  // State management
  const [selectedProduct, setSelectedProduct] = useState<ProductType | null>(
    null
  );
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [formData, setFormData] = useState({
    numberValue: "",
    qrValue: "",
    imeiValue: "",
  });
  const [images, setImages] = useState({
    imageUri1: null as string | null,
    imageUri2: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    heading: "",
    message: "",
  });

  // Utility functions
  const showModal = (heading: string, message: string) => {
    setModal({ visible: true, heading, message });
  };

  const hideModal = () => {
    setModal({ ...modal, visible: false });
  };

  const resetForm = () => {
    setFormData({ numberValue: "", qrValue: "", imeiValue: "" });
    setImages({ imageUri1: null, imageUri2: null });
  };

  const resetAll = () => {
    setSelectedForm(null);
    resetForm();
  };

  // Product and form handlers
  const handleProductChange = (product: ProductType) => {
    setSelectedProduct(product);
    resetAll();
  };

  const handleFormChange = (newForm: FormType) => {
    setSelectedForm(newForm);
    resetForm();
  };

  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Image handling
  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showModal("Permission Error", "Permission to access camera was denied.");
      return false;
    }
    return true;
  };

  const pickImage = async (imageKey: "imageUri1" | "imageUri2") => {
    if (!(await requestImagePermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImages((prev) => ({ ...prev, [imageKey]: result.assets[0].uri }));
    }
  };

  const removeImage = (imageKey: "imageUri1" | "imageUri2") => {
    setImages((prev) => ({ ...prev, [imageKey]: null }));
  };

  // Validation
  const validateForm = (): { isValid: boolean; message?: string } => {
    if (
      selectedForm === "imeiQR" &&
      (!formData.imeiValue || !formData.qrValue)
    ) {
      return { isValid: false, message: "Please enter IMEI & QR value." };
    }

    if (
      selectedForm === "accountQR" &&
      (!formData.numberValue || !formData.qrValue)
    ) {
      return { isValid: false, message: "Please fill in all required fields." };
    }

    if (selectedForm === "verpackung") {
      if (selectedProduct === "basisstation" && !images.imageUri1) {
        return { isValid: false, message: "Please upload an image." };
      }
      if (
        selectedProduct === "james_uhr" &&
        (!images.imageUri1 || !images.imageUri2)
      ) {
        return { isValid: false, message: "Please upload both images." };
      }
    }

    return { isValid: true };
  };

  // API functions
  const uploadImage = async (
    imageUri: string,
    imageName: string
  ): Promise<string> => {
    const formData = new FormData();
    const imageInfo = {
      uri: imageUri,
      name: imageName,
      type: "image/jpeg",
    };
    formData.append("image", imageInfo as any);

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
    return result.url;
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadPromises: Promise<string>[] = [];

    if (images.imageUri1) {
      uploadPromises.push(uploadImage(images.imageUri1, "image1.jpg"));
    }
    if (images.imageUri2) {
      uploadPromises.push(uploadImage(images.imageUri2, "image2.jpg"));
    }

    return Promise.all(uploadPromises);
  };

  const buildPayload = (uploadedImageLinks: string[]) => {
    const basePayload = {
      product_way: selectedProduct,
    };

    switch (selectedForm) {
      case "imeiQR":
        return {
          ...basePayload,
          imei: formData.imeiValue,
          qrCode: formData.qrValue,
          way: "imei-qr-code",
        };

      case "accountQR":
        return {
          ...basePayload,
          number: formData.numberValue,
          qrCode: formData.qrValue,
          way: "account-id-with-qr-code",
        };

      case "verpackung":
        if (selectedProduct === "basisstation") {
          return {
            imageLink: uploadedImageLinks[0],
            way: "picutre-box",
          };
        } else {
          return {
            ...basePayload,
            imeiImage: uploadedImageLinks[0],
            qrCodeImage: uploadedImageLinks[1],
            way: "picutre-box",
          };
        }

      default:
        throw new Error("Invalid form type");
    }
  };

  const sendToWebhook = async (payload: any) => {
    const response = await fetch(API_CONFIG.webhookEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status}`);
    }

    const result = await response.text();
    if (result !== "done") {
      throw new Error(`Server response: ${result}`);
    }
  };

  // Main submit handler
  const handleSend = async () => {
    const validation = validateForm();
    if (!validation.isValid) {
      showModal("Missing Information", validation.message!);
      return;
    }

    setIsLoading(true);

    try {
      const uploadedImageLinks = await uploadImages();
      const payload = buildPayload(uploadedImageLinks);

      console.log("Payload to send:", payload);

      await sendToWebhook(payload);

      showModal(
        "Daten übermittelt",
        "Die Daten wurden erfolgreich übermittelt."
      );
      resetForm();
    } catch (error) {
      console.error("Error during data submission:", error);
      showModal("Error", "Daten konnten nicht übermittelt werden!");
    } finally {
      setIsLoading(false);
    }
  };

  // Render functions
  const renderProductSelection = () => (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.selectionContainer}>
        <Image source={{ uri: LOGO_URL }} style={styles.selectionLogo} />
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => handleProductChange("basisstation")}
        >
          <Text style={styles.selectionButtonText}>Basisstation</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.selectionButton}
          onPress={() => handleProductChange("james_uhr")}
        >
          <Text style={styles.selectionButtonText}>JAMES Uhr</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Version {APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );

  const renderFormOptions = () => {
    const options =
      selectedProduct === "basisstation"
        ? [
            { key: "accountQR" as FormType, label: "Account ID & QR Code" },
            {
              key: "verpackung" as FormType,
              label: "Verpackungsbild verarbeiten",
            },
          ]
        : [
            { key: "imeiQR" as FormType, label: "IMEI & QR Code" },
            {
              key: "verpackung" as FormType,
              label: "Verpackungsbild verarbeiten",
            },
          ];

    return (
      <View style={styles.selectionOptions}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={styles.selectionButton}
            onPress={() => handleFormChange(option.key)}
          >
            <Text style={styles.selectionButtonText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderTextInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    iconName: any,
    keyboardType: any = "default",
    maxLength?: number
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons
          name={iconName}
          size={20}
          color="#3E7BFA"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#A0A0A0"
          keyboardType={keyboardType}
          maxLength={maxLength}
        />
      </View>
    </View>
  );

  const renderImageUpload = (
    label: string,
    imageUri: string | null,
    onPress: () => void,
    onRemove: () => void,
    buttonText: string
  ) => (
    <View style={styles.imageSection}>
      <Text style={styles.inputLabel}>{label}</Text>
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.removeImageButton} onPress={onRemove}>
            <Ionicons name="close-circle" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.uploadButton} onPress={onPress}>
          <Ionicons name="camera-outline" size={28} color="#3E7BFA" />
          <Text style={styles.uploadButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFormInputs = () => {
    if (selectedForm === "imeiQR" && selectedProduct === "james_uhr") {
      return (
        <>
          {renderTextInput(
            "IMEI",
            formData.imeiValue,
            (text) => updateFormData("imeiValue", text),
            "Enter IMEI",
            "keypad-outline",
            "number-pad",
            15
          )}
          {renderTextInput(
            "QR Code",
            formData.qrValue,
            (text) => updateFormData("qrValue", text),
            "Enter QR Code",
            "qr-code-outline"
          )}
        </>
      );
    }

    if (selectedForm === "accountQR" && selectedProduct === "basisstation") {
      return (
        <>
          {renderTextInput(
            "Account ID",
            formData.numberValue,
            (text) => updateFormData("numberValue", text),
            "Enter Account ID",
            "keypad-outline",
            "number-pad",
            15
          )}
          {renderTextInput(
            "QR Code",
            formData.qrValue,
            (text) => updateFormData("qrValue", text),
            "Enter QR Code",
            "qr-code-outline"
          )}
        </>
      );
    }

    if (selectedForm === "verpackung") {
      if (selectedProduct === "basisstation") {
        return renderImageUpload(
          "Bild hochladen",
          images.imageUri1,
          () => pickImage("imageUri1"),
          () => removeImage("imageUri1"),
          "Upload Photo"
        );
      } else {
        return (
          <>
            {renderImageUpload(
              "IMEI Bild",
              images.imageUri1,
              () => pickImage("imageUri1"),
              () => removeImage("imageUri1"),
              "Upload IMEI Bild"
            )}
            {renderImageUpload(
              "QR Code Bild",
              images.imageUri2,
              () => pickImage("imageUri2"),
              () => removeImage("imageUri2"),
              "Upload QR Code Bild"
            )}
          </>
        );
      }
    }

    return null;
  };

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
              modal.heading === "Daten übermittelt"
                ? "checkmark-circle"
                : "close-circle"
            }
            size={50}
            color={modal.heading === "Daten übermittelt" ? "green" : "red"}
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

  const renderMainContent = () => (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Image source={{ uri: LOGO_URL }} style={styles.logo} />
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setSelectedProduct(null)}
            >
              <Ionicons name="menu" size={24} color="#FFFFFF" />
              <Text style={styles.menuButtonText}>Menü</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            {!selectedForm && renderFormOptions()}
            {renderFormInputs()}

            {selectedForm && (
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  isLoading && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={isLoading}
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
                    <Text style={styles.sendButtonText}>Daten senden</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
      {renderModal()}
    </SafeAreaView>
  );

  // Main render
  return selectedProduct ? renderMainContent() : renderProductSelection();
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
  selectionOptions: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
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
